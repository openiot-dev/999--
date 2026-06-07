"""Tkinter GUI. 메인 스레드에서만 위젯을 다루고, 워커와는 queue 로만 통신한다."""
from __future__ import annotations

import queue
import subprocess
import sys
import threading
from pathlib import Path

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext

from .config import (
    Settings,
    LANGUAGE_CHOICES,
    WHISPER_MODELS,
    DEFAULT_WHISPER_MODEL,
)
from .transcribe import whisper_status
from .worker import (
    run_batch,
    Log, Phase, Total, VideoStart, VideoProgress, VideoDone, Finished,
)

_STATUS_EMOJI = {
    "saved": "✅ 저장",
    "exists": "↷ 이미 있음",
    "no_captions": "✋ 자막 없음(건너뜀)",
    "skipped": "⊘ 건너뜀",
    "blocked": "⚠ 차단",
    "empty": "∅ 내용 없음",
    "error": "❌ 오류",
}


class App:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.queue: "queue.Queue" = queue.Queue()
        self.cancel_event = threading.Event()
        self.worker: threading.Thread | None = None
        self.completed = 0
        self.total = 0
        self._cur_title = ""          # 현재 영상 라벨(진행 메모와 분리 보관)
        self._video_indeterminate = False
        self._after_id: str | None = None

        root.title("유튜브 대본 추출기")
        root.minsize(720, 560)

        self._build_ui()
        root.protocol("WM_DELETE_WINDOW", self._on_close)
        self._after_id = self.root.after(100, self._poll)

    # ───────────────────────── UI 구성 ─────────────────────────
    def _build_ui(self) -> None:
        pad = {"padx": 8, "pady": 4}
        root = self.root
        root.columnconfigure(0, weight=1)

        # URL
        frm_url = ttk.Frame(root)
        frm_url.grid(row=0, column=0, sticky="ew", **pad)
        frm_url.columnconfigure(1, weight=1)
        ttk.Label(frm_url, text="채널 / 재생목록 / 영상 URL").grid(row=0, column=0, sticky="w")
        self.var_url = tk.StringVar()
        ttk.Entry(frm_url, textvariable=self.var_url).grid(row=0, column=1, sticky="ew", padx=(8, 0))

        # 출력 폴더
        frm_out = ttk.Frame(root)
        frm_out.grid(row=1, column=0, sticky="ew", **pad)
        frm_out.columnconfigure(1, weight=1)
        ttk.Label(frm_out, text="저장 폴더").grid(row=0, column=0, sticky="w")
        self.var_out = tk.StringVar(value=str(Path.home() / "Downloads" / "youtube_transcripts"))
        ttk.Entry(frm_out, textvariable=self.var_out).grid(row=0, column=1, sticky="ew", padx=8)
        ttk.Button(frm_out, text="찾아보기…", command=self._choose_dir).grid(row=0, column=2)

        # 옵션
        frm_opt = ttk.LabelFrame(root, text="옵션")
        frm_opt.grid(row=2, column=0, sticky="ew", **pad)
        for c in range(4):
            frm_opt.columnconfigure(c, weight=1)

        ttk.Label(frm_opt, text="언어").grid(row=0, column=0, sticky="w", padx=6, pady=4)
        self.var_lang = tk.StringVar(value=LANGUAGE_CHOICES[0][0])
        ttk.Combobox(
            frm_opt, textvariable=self.var_lang, state="readonly",
            values=[name for name, _ in LANGUAGE_CHOICES],
        ).grid(row=0, column=1, sticky="ew", padx=6)

        ttk.Label(frm_opt, text="Whisper 모델").grid(row=0, column=2, sticky="w", padx=6)
        self.var_model = tk.StringVar(value=DEFAULT_WHISPER_MODEL)
        ttk.Combobox(
            frm_opt, textvariable=self.var_model, state="readonly", values=WHISPER_MODELS,
        ).grid(row=0, column=3, sticky="ew", padx=6)

        self.var_whisper = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            frm_opt, text="자막 없으면 음성인식 사용", variable=self.var_whisper,
        ).grid(row=1, column=0, columnspan=2, sticky="w", padx=6, pady=2)

        self.var_skip = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            frm_opt, text="이미 추출된 영상 건너뛰기", variable=self.var_skip,
        ).grid(row=1, column=2, columnspan=2, sticky="w", padx=6)

        self.var_shorts = tk.BooleanVar(value=True)
        ttk.Checkbutton(frm_opt, text="Shorts 포함", variable=self.var_shorts).grid(
            row=2, column=0, sticky="w", padx=6)
        self.var_streams = tk.BooleanVar(value=True)
        ttk.Checkbutton(frm_opt, text="라이브 다시보기 포함", variable=self.var_streams).grid(
            row=2, column=1, sticky="w", padx=6)

        ttk.Label(frm_opt, text="프록시(선택)").grid(row=3, column=0, sticky="w", padx=6, pady=4)
        self.var_proxy = tk.StringVar()
        ttk.Entry(frm_opt, textvariable=self.var_proxy).grid(
            row=3, column=1, columnspan=3, sticky="ew", padx=6)

        ttk.Label(frm_opt, text=f"음성인식 엔진: {whisper_status()}", foreground="#666").grid(
            row=4, column=0, columnspan=4, sticky="w", padx=6, pady=(2, 6))

        # 버튼
        frm_btn = ttk.Frame(root)
        frm_btn.grid(row=3, column=0, sticky="ew", **pad)
        self.btn_start = ttk.Button(frm_btn, text="추출 시작", command=self._start)
        self.btn_start.pack(side="left")
        self.btn_cancel = ttk.Button(frm_btn, text="중지", command=self._cancel, state="disabled")
        self.btn_cancel.pack(side="left", padx=6)
        ttk.Button(frm_btn, text="저장 폴더 열기", command=self._open_dir).pack(side="left")

        # 진행 상태
        frm_prog = ttk.Frame(root)
        frm_prog.grid(row=4, column=0, sticky="ew", **pad)
        frm_prog.columnconfigure(0, weight=1)
        self.var_status = tk.StringVar(value="대기 중")
        ttk.Label(frm_prog, textvariable=self.var_status).grid(row=0, column=0, sticky="w")
        self.pb_overall = ttk.Progressbar(frm_prog, mode="determinate")
        self.pb_overall.grid(row=1, column=0, sticky="ew", pady=2)
        self.var_current = tk.StringVar(value="")
        ttk.Label(frm_prog, textvariable=self.var_current).grid(row=2, column=0, sticky="w")
        self.pb_video = ttk.Progressbar(frm_prog, mode="determinate")
        self.pb_video.grid(row=3, column=0, sticky="ew", pady=2)

        # 로그
        frm_log = ttk.Frame(root)
        frm_log.grid(row=5, column=0, sticky="nsew", **pad)
        root.rowconfigure(5, weight=1)
        frm_log.rowconfigure(0, weight=1)
        frm_log.columnconfigure(0, weight=1)
        self.txt_log = scrolledtext.ScrolledText(frm_log, height=12, wrap="word", state="disabled")
        self.txt_log.grid(row=0, column=0, sticky="nsew")
        self.txt_log.tag_config("warn", foreground="#b5651d")
        self.txt_log.tag_config("error", foreground="#c0392b")
        self.txt_log.tag_config("good", foreground="#1e7e34")

    # ───────────────────────── 동작 ─────────────────────────
    def _choose_dir(self) -> None:
        d = filedialog.askdirectory(initialdir=self.var_out.get() or str(Path.home()))
        if d:
            self.var_out.set(d)

    def _open_dir(self) -> None:
        d = self.var_out.get().strip()
        if not d:
            return
        Path(d).mkdir(parents=True, exist_ok=True)
        if sys.platform == "darwin":
            subprocess.run(["open", d], check=False)
        elif sys.platform.startswith("win"):
            subprocess.run(["explorer", d], check=False)
        else:
            subprocess.run(["xdg-open", d], check=False)

    def _gather_settings(self) -> Settings:
        lang_code = dict(LANGUAGE_CHOICES).get(self.var_lang.get(), "ko")
        return Settings(
            url=self.var_url.get().strip(),
            output_dir=self.var_out.get().strip(),
            language_code=lang_code,
            enable_whisper=self.var_whisper.get(),
            whisper_model=self.var_model.get(),
            skip_existing=self.var_skip.get(),
            include_shorts=self.var_shorts.get(),
            include_streams=self.var_streams.get(),
            proxy=self.var_proxy.get().strip(),
        )

    def _start(self) -> None:
        if self.worker and self.worker.is_alive():
            return
        s = self._gather_settings()
        if not s.url:
            messagebox.showwarning("입력 필요", "URL을 입력하세요.")
            return
        if not s.output_dir:
            messagebox.showwarning("입력 필요", "저장 폴더를 선택하세요.")
            return
        try:
            Path(s.output_dir).mkdir(parents=True, exist_ok=True)
        except Exception as exc:  # noqa: BLE001
            messagebox.showerror("폴더 오류", f"저장 폴더를 만들 수 없습니다:\n{exc}")
            return

        self._clear_log()
        self.completed = 0
        self.total = 0
        self.pb_overall.configure(value=0, maximum=100)
        self.pb_video.configure(value=0, maximum=100)
        self.var_current.set("")
        self.cancel_event.clear()
        self._set_running(True)

        self.worker = threading.Thread(
            target=run_batch, args=(s, self.queue, self.cancel_event), daemon=True
        )
        self.worker.start()

    def _cancel(self) -> None:
        self.cancel_event.set()
        self.var_status.set("중지 요청됨 — 현재 작업을 정리하는 중…")
        self.btn_cancel.configure(state="disabled")

    def _on_close(self) -> None:
        # 작업 중이면 확인 후, 워커가 임시폴더를 정리할 시간을 잠깐 준다.
        if self.worker and self.worker.is_alive():
            if not messagebox.askyesno("종료", "추출이 진행 중입니다. 종료할까요?"):
                return
            self.cancel_event.set()
            self.worker.join(timeout=10)
        if self._after_id is not None:
            try:
                self.root.after_cancel(self._after_id)
            except Exception:  # noqa: BLE001
                pass
        self.root.destroy()

    def _set_running(self, running: bool) -> None:
        self.btn_start.configure(state="disabled" if running else "normal")
        self.btn_cancel.configure(state="normal" if running else "disabled")

    # ───────────────────────── 큐 폴링 ─────────────────────────
    def _poll(self) -> None:
        try:
            while True:
                msg = self.queue.get_nowait()
                try:
                    self._handle(msg)
                except Exception as exc:  # noqa: BLE001 - 메시지 하나가 루프를 죽이지 않게
                    self._log(f"내부 오류: {exc}", "error")
        except queue.Empty:
            pass
        finally:
            # finally 로 보장: 어떤 일이 있어도 폴링은 계속 예약된다
            self._after_id = self.root.after(100, self._poll)

    def _handle(self, msg) -> None:
        if isinstance(msg, Phase):
            self.var_status.set(msg.text)
            self._log(msg.text)
        elif isinstance(msg, Log):
            self._log(msg.text, msg.level)
        elif isinstance(msg, Total):
            self.total = msg.count
            self.pb_overall.configure(maximum=max(msg.count, 1), value=0)
            self.var_status.set(f"총 {msg.count}개 영상")
        elif isinstance(msg, VideoStart):
            self._cur_title = f"[{msg.index}/{msg.total}] {msg.title}"
            self.var_current.set(self._cur_title)
            self._set_video_indeterminate(False)
            self.pb_video.configure(value=0)
        elif isinstance(msg, VideoProgress):
            note = msg.note or ""
            # 음성인식 시작 직후엔 아직 세그먼트가 없어 진행률이 멈춰 보임 → 애니메이션
            if "음성 인식" in note and msg.fraction <= 0.41:
                self._set_video_indeterminate(True)
            else:
                self._set_video_indeterminate(False)
                self.pb_video.configure(value=msg.fraction * 100)
            if note:
                self.var_current.set(f"{self._cur_title}  —  {note}")
        elif isinstance(msg, VideoDone):
            self._set_video_indeterminate(False)
            self.completed += 1
            self.pb_overall.configure(value=self.completed)
            self.pb_video.configure(value=100)
            label = _STATUS_EMOJI.get(msg.status, msg.status)
            extra = ""
            if msg.source:
                extra = f" ({msg.source})"
            elif msg.note:
                extra = f" — {msg.note}"
            level = "good" if msg.status == "saved" else (
                "error" if msg.status == "error" else (
                    "warn" if msg.status in ("blocked", "empty") else "info"))
            self._log(f"  {label}{extra}", level)
        elif isinstance(msg, Finished):
            self._finish(msg)

    def _set_video_indeterminate(self, on: bool) -> None:
        if on and not self._video_indeterminate:
            self.pb_video.configure(mode="indeterminate")
            self.pb_video.start(12)
            self._video_indeterminate = True
        elif not on and self._video_indeterminate:
            self.pb_video.stop()
            self.pb_video.configure(mode="determinate")
            self._video_indeterminate = False

    def _finish(self, msg: Finished) -> None:
        self._set_running(False)
        self._set_video_indeterminate(False)
        self.var_current.set("")
        c = msg.counts or {}
        errs = c.get("error", 0)
        if msg.error:
            self.var_status.set("오류로 종료됨")
        elif msg.cancelled:
            self.var_status.set("사용자가 중지함")
        elif errs:
            self.var_status.set(f"완료 (오류 {errs}건)")
        else:
            self.var_status.set("완료 ✅")
        summary = (
            f"저장 {c.get('saved', 0)} · 이미있음 {c.get('exists', 0)} · "
            f"자막없음 {c.get('no_captions', 0)} · 건너뜀 {c.get('skipped', 0)} · "
            f"빈내용 {c.get('empty', 0)} · 오류 {errs}"
        )
        blocked = c.get("blocked_events", 0)
        if blocked:
            summary += f"   (자막 차단 {blocked}건은 음성인식으로 대체)"
        self._log("──────── 결과 ────────")
        level = "error" if (msg.error or errs) else "good"
        self._log(summary, level)

    # ───────────────────────── 로그 유틸 ─────────────────────────
    def _log(self, text: str, level: str = "info") -> None:
        self.txt_log.configure(state="normal")
        tag = level if level in ("warn", "error", "good") else ""
        self.txt_log.insert("end", text + "\n", tag)
        self.txt_log.see("end")
        self.txt_log.configure(state="disabled")

    def _clear_log(self) -> None:
        self.txt_log.configure(state="normal")
        self.txt_log.delete("1.0", "end")
        self.txt_log.configure(state="disabled")


def main() -> None:
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()

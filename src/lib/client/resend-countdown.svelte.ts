export class ResendCountdown {
	remaining = $state(0);
	#deadline = 0;
	#timer: ReturnType<typeof setInterval> | null = null;

	start(seconds: number) {
		this.#stop();
		this.#deadline = Date.now() + seconds * 1000;
		this.remaining = Math.max(0, Math.ceil(seconds));
		if (this.remaining === 0) return;
		this.#timer = setInterval(() => {
			this.remaining = Math.max(0, Math.ceil((this.#deadline - Date.now()) / 1000));
			if (this.remaining === 0) this.#stop();
		}, 250);
	}

	destroy() {
		this.#stop();
	}

	#stop() {
		if (this.#timer !== null) clearInterval(this.#timer);
		this.#timer = null;
	}
}

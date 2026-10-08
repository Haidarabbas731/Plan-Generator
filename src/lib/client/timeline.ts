export interface TimelineStep {
	at: number;
	run: () => void;
}

export function runTimeline(steps: TimelineStep[]): () => void {
	const timers = steps.map((step) => setTimeout(step.run, step.at));
	return () => {
		for (const timer of timers) clearTimeout(timer);
	};
}

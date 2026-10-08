<script lang="ts">
	import CalendarCheckIcon from '@lucide/svelte/icons/calendar-check';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LockKeyholeIcon from '@lucide/svelte/icons/lock-keyhole';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import BenefitTile from '#lib/components/landing/benefit-tile.svelte';
	import FaqItem from '#lib/components/landing/faq-item.svelte';
	import LandingFooter from '#lib/components/landing/landing-footer.svelte';
	import SamplePlan from '#lib/components/landing/sample-plan.svelte';
	import StepCard from '#lib/components/landing/step-card.svelte';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { inview } from '#lib/client/inview.js';
	import { smoothAnchorClick } from '#lib/client/smooth-anchor.js';
	import { BENEFITS, FAQ, PROOF_POINTS, STEPS } from '#lib/landing-content.js';

	const benefitIcons = [CalendarCheckIcon, LayersIcon, MessageSquareIcon, LockKeyholeIcon];

	const title = 'Plan Generator: turn any goal into a day-by-day plan';
	const description =
		'Say what you want to learn and get a task for every day, a milestone for every block and a chat to adjust it. Free to use with your own AI key.';

	const faqJsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: FAQ.map((entry) => ({
			'@type': 'Question',
			name: entry.question,
			acceptedAnswer: { '@type': 'Answer', text: entry.answer }
		}))
	}).replace(/</g, '\\u003c');
</script>

<svelte:window onclickcapture={smoothAnchorClick} />

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static FAQ JSON with "<" escaped -->
	{@html `<script type="application/ld+json">${faqJsonLd}</` + 'script>'}
</svelte:head>

<div class="frame">
	<section class="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
		<div class="flex flex-col items-start gap-6">
			<h1 class="reveal text-display" style="--reveal-i: 0">
				Turn any goal into a plan for every single day
			</h1>
			<p class="max-w-prose reveal text-body text-muted-foreground" style="--reveal-i: 1">
				Say what you want to learn and how much time you have. You get a task for every day, a
				checkpoint every few days, and a chat that reshapes the plan when your week changes.
			</p>
			<div
				class="flex w-full reveal flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
				style="--reveal-i: 2"
			>
				<a href="/signup" class={buttonVariants({ size: 'lg' })}>Create my first plan</a>
				<a href="#how-it-works" class={buttonVariants({ variant: 'ghost', size: 'lg' })}>
					See how it works
				</a>
			</div>
			<ul
				class="flex reveal flex-wrap gap-x-5 gap-y-1.5 text-caption text-muted-foreground"
				style="--reveal-i: 3"
			>
				{#each PROOF_POINTS as point (point)}
					<li class="flex items-center gap-1.5">
						<CheckIcon class="size-3.5 text-primary" aria-hidden="true" />
						{point}
					</li>
				{/each}
			</ul>
		</div>

		<div class="flex reveal justify-center lg:justify-end" style="--reveal-i: 4">
			<SamplePlan />
		</div>
	</section>

	<section class="grid gap-6 border-t py-16 sm:py-24 lg:grid-cols-2 lg:gap-16" {@attach inview()}>
		<h2 data-reveal-item style="--reveal-i: 0" class="text-title">
			Big goals stall because nobody tells you what to do on a Tuesday.
		</h2>
		<p
			data-reveal-item
			style="--reveal-i: 1"
			class="max-w-prose self-center text-body text-muted-foreground"
		>
			Plan Generator writes the Tuesday: what to learn, what to practice, what to review, and when
			you are done. Then it sits in your pocket as a plan you can read, tick off and change by
			talking to it.
		</p>
	</section>

	<section class="pb-16 sm:pb-24" aria-labelledby="benefits-heading" {@attach inview()}>
		<h2 id="benefits-heading" data-reveal-item style="--reveal-i: 0" class="text-title">
			What you get
		</h2>
		<ul class="mt-8 grid gap-4 sm:grid-cols-2">
			{#each BENEFITS as benefit, i (benefit.title)}
				<BenefitTile {benefit} index={i} icon={benefitIcons[i]} />
			{/each}
		</ul>
	</section>

	<section id="how-it-works" class="scroll-mt-20 border-t py-16 sm:py-24" {@attach inview()}>
		<h2 data-reveal-item style="--reveal-i: 0" class="text-title">How it works</h2>
		<ol class="mt-10 grid gap-10 md:grid-cols-3 md:gap-6">
			<StepCard step={STEPS[0]} index={0}>
				{#snippet mock()}
					<p class="rounded-lg border border-input bg-card p-3">
						Learn Rust well enough to build a CLI tool
					</p>
					<p class="text-caption text-muted-foreground">30 sessions · 1.5 hours each</p>
				{/snippet}
			</StepCard>
			<StepCard step={STEPS[1]} index={1}>
				{#snippet mock()}
					{#each ['Block 1 · Getting started', 'Block 2 · Ownership and borrowing'] as block (block)}
						<p class="flex items-center gap-2">
							<span
								class="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
							>
								<CheckIcon class="size-3" />
							</span>
							{block}
						</p>
					{/each}
					<p class="flex items-center gap-2 text-muted-foreground">
						<span class="flex size-5 shrink-0 items-center justify-center">
							<Spinner class="size-4 text-primary" />
						</span>
						Block 3 · Structs and traits
					</p>
				{/snippet}
			</StepCard>
			<StepCard step={STEPS[2]} index={2}>
				{#snippet mock()}
					<p class="flex items-center gap-2">
						<span
							class="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-primary text-primary-foreground"
						>
							<CheckIcon class="size-3.5" />
						</span>
						Day 8 · Lifetimes in structs
					</p>
					<p class="ml-auto rounded-xl bg-accent px-3 py-2 text-accent-foreground">
						Make block 3 easier
					</p>
					<p class="text-caption text-muted-foreground">Done. Undo</p>
				{/snippet}
			</StepCard>
		</ol>
	</section>
</div>

<section class="bg-muted/40 py-16 sm:py-24" aria-labelledby="key-heading" {@attach inview()}>
	<div class="frame flex flex-col gap-10">
		<div data-reveal-item style="--reveal-i: 0" class="flex flex-col gap-3">
			<h2 id="key-heading" class="text-title">Free to use. You bring the AI.</h2>
			<p class="max-w-prose text-body text-muted-foreground">
				Plans are written with an AI key from a provider you choose. Nothing here is paid.
			</p>
		</div>
		<div class="grid gap-8 md:max-w-3xl md:grid-cols-2">
			<div data-reveal-item style="--reveal-i: 1" class="flex flex-col gap-2">
				<h3 class="text-heading">What it costs</h3>
				<p class="text-sm text-muted-foreground">
					You pay your AI provider directly. The size of the bill depends on the model you pick, and
					the new-plan form shows how many calls a plan will use before you start.
				</p>
			</div>
			<div data-reveal-item style="--reveal-i: 2" class="flex flex-col gap-2">
				<h3 class="text-heading">How your key is handled</h3>
				<p class="text-sm text-muted-foreground">
					It is encrypted when stored, shown only as its last four characters, and used only to
					write and change your plans. Delete it any time.
				</p>
			</div>
		</div>
	</div>
</section>

<div class="frame">
	<section id="faq" class="scroll-mt-20 py-16 sm:py-24" {@attach inview()}>
		<h2 data-reveal-item style="--reveal-i: 0" class="text-center text-title">Questions</h2>
		<ul class="mx-auto mt-8 max-w-3xl divide-y overflow-hidden rounded-xl surface-flat">
			{#each FAQ as entry, i (entry.question)}
				<FaqItem {entry} index={i} />
			{/each}
		</ul>
	</section>

	<section class="pb-16 sm:pb-24" {@attach inview()}>
		<div
			data-reveal-item
			style="--reveal-i: 0"
			class="flex flex-col items-center gap-5 rounded-2xl bg-accent/60 px-6 py-12 text-center sm:py-16"
		>
			<h2 class="text-title">Start with one goal.</h2>
			<p class="max-w-md text-body text-muted-foreground">
				Free. Delete your account and data any time.
			</p>
			<a href="/signup" class={buttonVariants({ size: 'lg' })}>Create my first plan</a>
		</div>
	</section>
</div>

<LandingFooter />

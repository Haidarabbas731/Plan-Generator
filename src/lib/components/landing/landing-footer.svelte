<script lang="ts">
	import Logo from '#lib/components/shared/logo.svelte';

	const linkClass =
		'inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline';
</script>

<footer class="border-t">
	<div class="frame flex flex-col gap-10 py-12">
		<div class="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
			<div class="flex flex-col gap-3">
				<Logo />
				<p class="max-w-xs text-caption text-muted-foreground">
					Your plans and chats live in your account, and you can export or delete them at any time.
				</p>
			</div>
			<nav aria-label="Product" class="flex flex-col">
				<p class="text-caption font-medium">Product</p>
				<a href="#how-it-works" class={linkClass}>How it works</a>
				<a href="#faq" class={linkClass}>FAQ</a>
			</nav>
			<nav aria-label="Account" class="flex flex-col">
				<p class="text-caption font-medium">Account</p>
				<a href="/login" class={linkClass}>Sign in</a>
				<a href="/signup" class={linkClass}>Create account</a>
			</nav>
		</div>
	</div>
</footer>

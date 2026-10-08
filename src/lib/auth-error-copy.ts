export interface AuthErrorCopy {
	title: string;
	body: string;
}

const COPY: Record<string, AuthErrorCopy> = {
	account_not_linked: {
		title: 'Sign in with your password first',
		body: 'An account with this email already exists, but its email has not been verified. Sign in with your email and password, enter the code we email you, then connect Google or GitHub from Settings.'
	},
	unable_to_link_account: {
		title: 'We could not connect that account',
		body: 'Sign in with your email and password, then connect Google or GitHub from Settings.'
	},
	access_denied: {
		title: 'Sign-in was cancelled',
		body: 'You did not finish signing in. Try again when you are ready.'
	},
	email_not_found: {
		title: 'No email address shared',
		body: 'The provider did not share an email address with us. Use another sign-in method.'
	},
	unable_to_get_user_info: {
		title: 'We could not read your account details',
		body: 'The provider did not return your profile. Try again, or use your email and password.'
	},
	state_mismatch: {
		title: 'That sign-in link expired',
		body: 'Start again from the sign-in page.'
	},
	state_not_found: {
		title: 'That sign-in link expired',
		body: 'It may have been used already or opened in another browser. Start again from the sign-in page.'
	},
	no_code: {
		title: 'Sign-in was not completed',
		body: 'The provider did not send us back a sign-in code. Try again from the sign-in page.'
	},
	invalid_code: {
		title: 'Sign-in was not completed',
		body: 'The provider rejected the sign-in. Try again from the sign-in page.'
	},
	email_does_not_match: {
		title: 'That account uses a different email',
		body: 'Connect an account that has the same email address as yours, or sign in with that account directly.'
	},
	account_already_linked_to_different_user: {
		title: 'That account is already in use',
		body: 'It is connected to a different Plan Generator account. Sign in with that one instead.'
	},
	email_not_verified: {
		title: 'Verify your email first',
		body: 'The provider has not verified this email address. Verify it there, or sign in with your email and password.'
	},
	internal_server_error: {
		title: "Sign-in didn't work",
		body: 'Something went wrong on our side. Try again in a moment.'
	}
};

const FALLBACK: AuthErrorCopy = {
	title: "Sign-in didn't work",
	body: 'Something went wrong while signing in. Try again, or use your email and password.'
};

export function authErrorCopy(code: string | null | undefined): AuthErrorCopy {
	return COPY[(code ?? '').toLowerCase()] ?? FALLBACK;
}

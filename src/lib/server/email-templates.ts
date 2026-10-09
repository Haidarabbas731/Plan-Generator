import { EMAIL_LOGO } from './email-logo.js';

export const APP_NAME = 'Plan Generator';

export interface RenderedEmail {
	subject: string;
	html: string;
	text: string;
	inlineLogo: boolean;
}

const FONT_SANS =
	"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const LIGHT = {
	page: '#f2fbf9',
	card: '#ffffff',
	border: '#cbe6e1',
	soft: '#e8f2f1',
	text: '#12403c',
	muted: '#43615e',
	accent: '#0f766e',
	onAccent: '#ffffff'
};

const DARK = {
	page: '#0a1d1c',
	card: '#102927',
	border: '#1f3b39',
	soft: '#16302e',
	text: '#e4f6f3',
	muted: '#9ebdb8',
	accent: '#2dd4bf',
	onAccent: '#04302c'
};

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export function spaceCode(code: string): string {
	const half = Math.ceil(code.length / 2);
	return `${code.slice(0, half)} ${code.slice(half)}`;
}

function button(url: string, label: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0 0;">
  <tr>
    <td class="btn-cell" align="center" bgcolor="${LIGHT.accent}" style="background-color:${LIGHT.accent};border:1px solid ${LIGHT.accent};border-radius:8px;">
      <a href="${escapeHtml(url)}" class="btn-link" target="_blank" style="display:inline-block;min-height:20px;padding:14px 28px;font-family:${FONT_SANS};font-size:16px;font-weight:600;line-height:20px;color:${LIGHT.onAccent};background-color:${LIGHT.accent};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function layout(args: { title: string; preheader: string; content: string; to: string }): string {
	const { title, preheader, content, to } = args;
	const filler = '&nbsp;&zwnj;'.repeat(60);
	return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    a { color: ${LIGHT.accent}; }
    @media (prefers-color-scheme: dark) {
      .bg-page { background-color: ${DARK.page} !important; }
      .bg-card { background-color: ${DARK.card} !important; border-color: ${DARK.border} !important; }
      .bg-soft { background-color: ${DARK.soft} !important; border-color: ${DARK.border} !important; }
      .text-main { color: ${DARK.text} !important; }
      .text-muted { color: ${DARK.muted} !important; }
      .btn-cell { background-color: ${DARK.accent} !important; border-color: ${DARK.accent} !important; }
      .btn-link { color: ${DARK.onAccent} !important; background-color: ${DARK.accent} !important; }
      a { color: ${DARK.accent}; }
    }
    @media only screen and (max-width: 520px) {
      .card-pad { padding: 28px 22px !important; }
      .code { font-size: 30px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body class="bg-page" style="margin:0;padding:0;background-color:${LIGHT.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${LIGHT.page};">
    ${escapeHtml(preheader)}${filler}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background-color:${LIGHT.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td style="padding:0 4px 20px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <img src="cid:${EMAIL_LOGO.contentId}" width="32" height="32" alt="" style="display:block;border:0;outline:none;width:32px;height:32px;">
                  </td>
                  <td class="text-main" style="vertical-align:middle;font-family:${FONT_SANS};font-size:20px;font-weight:700;line-height:32px;color:${LIGHT.text};">
                    ${APP_NAME}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="bg-card card-pad" style="background-color:${LIGHT.card};border:1px solid ${LIGHT.border};border-radius:12px;padding:36px 36px 32px 36px;font-family:${FONT_SANS};">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="text-muted" style="padding:20px 8px 0 8px;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${LIGHT.muted};text-align:center;">
              Sent by ${APP_NAME} to ${escapeHtml(to)}.<br>
              This is an automated message, so replies are not read.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function renderVerificationCodeEmail(args: {
	to: string;
	code: string;
	expiryMinutes: number;
}): RenderedEmail {
	const { to, code, expiryMinutes } = args;
	const spaced = spaceCode(code);
	const minutes = `${expiryMinutes} ${expiryMinutes === 1 ? 'minute' : 'minutes'}`;
	const subject = `Your ${APP_NAME} code is ${spaced}`;

	const content = `<h1 class="text-main" style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:700;color:${LIGHT.text};">Verify your email</h1>
<p class="text-main" style="margin:0;font-size:16px;line-height:1.6;color:${LIGHT.text};">
  Enter this code in ${APP_NAME} to verify your email address.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;">
  <tr>
    <td class="bg-soft" align="center" bgcolor="${LIGHT.soft}" style="background-color:${LIGHT.soft};border:1px solid ${LIGHT.border};border-radius:10px;padding:22px 12px;">
      <span class="code text-main" style="display:inline-block;font-family:${FONT_MONO};font-size:38px;line-height:1.1;font-weight:700;letter-spacing:10px;color:${LIGHT.text};">${escapeHtml(code)}</span>
    </td>
  </tr>
</table>
<p class="text-muted" style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:${LIGHT.muted};">
  The code works for ${minutes}. If you did not create a ${APP_NAME} account, ignore this email.
</p>`;

	const html = layout({
		title: subject,
		preheader: `Enter this code to verify your email. It works for ${minutes}.`,
		content,
		to
	});

	const text = `${subject}

Enter this code in ${APP_NAME} to verify your email address:

${code}

The code works for ${minutes}. If you did not create a ${APP_NAME} account, ignore this email.
`;

	return { subject, html, text, inlineLogo: true };
}

export function renderPasswordResetEmail(args: {
	to: string;
	url: string;
	expiryMinutes: number;
}): RenderedEmail {
	const { to, url, expiryMinutes } = args;
	const duration =
		expiryMinutes % 60 === 0
			? `${expiryMinutes / 60} ${expiryMinutes === 60 ? 'hour' : 'hours'}`
			: `${expiryMinutes} minutes`;
	const subject = `Reset your ${APP_NAME} password`;

	const content = `<h1 class="text-main" style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:700;color:${LIGHT.text};">Reset your password</h1>
<p class="text-main" style="margin:0;font-size:16px;line-height:1.6;color:${LIGHT.text};">
  Use the button below to choose a new password for your ${APP_NAME} account.
</p>
${button(url, 'Choose a new password')}
<p class="text-muted" style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:${LIGHT.muted};">
  The link works for ${duration} and can be used once. If the button does not work, copy this address into your browser:
</p>
<p class="text-muted" style="margin:8px 0 0 0;font-size:13px;line-height:1.5;color:${LIGHT.muted};word-break:break-all;">
  ${escapeHtml(url)}
</p>
<p class="text-muted" style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:${LIGHT.muted};">
  If you did not ask for this, ignore this email. Your password stays the same.
</p>`;

	const html = layout({
		title: subject,
		preheader: `Choose a new password. The link works for ${duration}.`,
		content,
		to
	});

	const text = `${subject}

Use this link to choose a new password for your ${APP_NAME} account:

${url}

The link works for ${duration} and can be used once. If you did not ask for this, ignore this email. Your password stays the same.
`;

	return { subject, html, text, inlineLogo: true };
}

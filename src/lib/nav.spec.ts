import { describe, expect, it } from 'vitest';
import { isCurrentPath, showsBackLink, showsTabBar } from './nav.js';

describe('isCurrentPath', () => {
	it('matches the path itself and anything below it', () => {
		expect(isCurrentPath('/plans', '/plans')).toBe(true);
		expect(isCurrentPath('/plans/abc', '/plans')).toBe(true);
		expect(isCurrentPath('/settings/keys', '/settings')).toBe(true);
	});

	it('does not match a longer name that only starts the same', () => {
		expect(isCurrentPath('/plansx', '/plans')).toBe(false);
		expect(isCurrentPath('/', '/plans')).toBe(false);
	});
});

describe('showsTabBar', () => {
	it('shows on the plans list and every settings page', () => {
		expect(showsTabBar('/plans')).toBe(true);
		expect(showsTabBar('/settings')).toBe(true);
		expect(showsTabBar('/settings/keys')).toBe(true);
	});

	it('hides on the form, a plan, the landing page and auth pages', () => {
		expect(showsTabBar('/plans/new')).toBe(false);
		expect(showsTabBar('/plans/abc')).toBe(false);
		expect(showsTabBar('/')).toBe(false);
		expect(showsTabBar('/login')).toBe(false);
		expect(showsTabBar('/settingsx')).toBe(false);
	});
});

describe('showsBackLink', () => {
	it('shows on the form and on a single plan', () => {
		expect(showsBackLink('/plans/new')).toBe(true);
		expect(showsBackLink('/plans/abc')).toBe(true);
	});

	it('hides on the lists, settings, exports and the landing page', () => {
		expect(showsBackLink('/plans')).toBe(false);
		expect(showsBackLink('/settings/keys')).toBe(false);
		expect(showsBackLink('/plans/abc/export/ics')).toBe(false);
		expect(showsBackLink('/')).toBe(false);
	});
});

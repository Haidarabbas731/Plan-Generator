export function showsTabBar(pathname: string): boolean {
	return pathname === '/plans' || pathname === '/settings' || pathname.startsWith('/settings/');
}

export function isCurrentPath(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`);
}

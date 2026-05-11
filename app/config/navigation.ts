import {
	Clock,
	LayoutDashboard,
	Terminal,
	Timer,
	Trophy,
} from 'lucide-vue-next'

export type UserRole = 'viewer' | 'moderator' | 'caster' | 'admin'

export interface NavItem {
	title: string
	url: string
	icon: any
	roles?: UserRole[]
}

export interface NavGroup {
	label: string
	items: NavItem[]
}

export const publicNav: NavItem[] = [
	{ title: 'Points Leaderboard', url: '/leaderboard/points', icon: Trophy },
	{ title: 'Watch Time', url: '/leaderboard/watch-time', icon: Clock },
]

export const adminGroups: NavGroup[] = [
	{
		label: 'Bot Administration',
		items: [
			{ title: 'Dashboard', url: '/admin', icon: LayoutDashboard, roles: ['moderator', 'caster'] },
			{ title: 'Commands', url: '/admin/commands', icon: Terminal, roles: ['moderator', 'caster'] },
			{ title: 'Timers', url: '/admin/timers', icon: Timer, roles: ['caster'] },
		],
	},
]

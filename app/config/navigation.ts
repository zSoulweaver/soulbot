import {
	Clock,
	LayoutDashboard,
	Music,
	PiggyBank,
	Terminal,
	Timer,
	Trophy,
} from 'lucide-vue-next'

export type UserRole = 'viewer' | 'moderator' | 'caster' | 'admin'

export interface NavItem {
	title: string
	url: string
	icon?: any
	roles?: UserRole[]
	items?: NavItem[]
}

export interface NavGroup {
	label: string
	items: NavItem[]
}

export const navigation: NavGroup[] = [
	{
		label: '',
		items: [
			{ title: 'Song Queue', url: '/song-queue', icon: Music },
		],
	},
	{
		label: 'Leaderboards',
		items: [
			{ title: 'Points Leaderboard', url: '/leaderboard/points', icon: Trophy },
			{ title: 'Watch Time', url: '/leaderboard/watch-time', icon: Clock },
		],
	},
	{
		label: 'Bot Administration',
		items: [
			{ title: 'Dashboard', url: '/admin', icon: LayoutDashboard, roles: ['moderator', 'caster'] },
			{ title: 'Commands', url: '/admin/commands', icon: Terminal, roles: ['moderator', 'caster'] },
			{ title: 'Timers', url: '/admin/timers', icon: Timer, roles: ['caster'] },
			{
				title: 'Points',
				url: '/admin/points',
				icon: PiggyBank,
				roles: ['caster', 'moderator'],
				items: [
					{ title: 'Payout Settings', url: '/admin/points' },
					{ title: 'Balances', url: '/admin/points/users' },
					{ title: 'Gambling', url: '/admin/points/gambling' },
				],
			},
		],
	},
]

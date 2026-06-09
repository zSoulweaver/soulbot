import {
	Bell,
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
			{
				title: 'Commands',
				url: '/admin/commands/core',
				icon: Terminal,
				roles: ['moderator', 'caster'],
				items: [
					{ title: 'Core Commands', url: '/admin/commands/core' },
					{ title: 'Custom Commands', url: '/admin/commands/custom' },
					{ title: 'Variable Reference', url: '/admin/commands/variables' },
				],
			},
			{ title: 'Timers', url: '/admin/timers', icon: Timer, roles: ['caster'] },
			{ title: 'Spotify', url: '/admin/spotify', icon: Music, roles: ['caster'] },
			{ title: 'Alerts & Events', url: '/admin/alerts', icon: Bell, roles: ['caster', 'moderator'] },
			{
				title: 'Points',
				url: '/admin/points',
				icon: PiggyBank,
				roles: ['caster', 'moderator'],
				items: [
					{ title: 'User Balances', url: '/admin/points/users' },
					{ title: 'Payout Settings', url: '/admin/points' },
					{ title: 'Payout Exclusions', url: '/admin/points/exclusions' },
					{ title: 'Gambling', url: '/admin/points/gambling' },
				],
			},
		],
	},
]

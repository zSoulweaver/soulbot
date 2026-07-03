import {
	Bell,
	Bot,
	Clock,
	LayoutDashboard,
	Megaphone,
	Music,
	PiggyBank,
	Terminal,
	Timer,
	Trophy,
} from '@lucide/vue'
import DiscordIcon from '~/components/icons/DiscordIcon.vue'

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
			{ title: 'Alerts & Events', url: '/admin/alerts', icon: Bell, roles: ['caster', 'moderator'] },
			{ title: 'Advertisements', url: '/admin/advertisements', icon: Megaphone, roles: ['caster', 'moderator'] },
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
			{
				title: 'Spotify',
				url: '/admin/spotify',
				icon: Music,
				roles: ['caster', 'moderator'],
				items: [
					{ title: 'Settings', url: '/admin/spotify', roles: ['caster'] },
					{ title: 'Blacklist', url: '/admin/spotify/blacklist', roles: ['moderator', 'caster'] },
				],
			},

			{
				title: 'Loyalty & Points',
				url: '/admin/loyalty',
				icon: PiggyBank,
				roles: ['caster', 'moderator'],
				items: [
					{ title: 'Payout Settings', url: '/admin/loyalty' },
					{ title: 'Payout Exclusions', url: '/admin/loyalty/exclusions' },
					{ title: 'Point Balances', url: '/admin/loyalty/users' },
					{ title: 'Watch Time Balances', url: '/admin/loyalty/watchtime' },
					{ title: 'Gambling', url: '/admin/loyalty/gambling' },
				],
			},
			{
				title: 'Discord',
				url: '/admin/discord/settings',
				icon: DiscordIcon,
				roles: ['caster', 'moderator'],
				items: [
					{ title: 'Settings', url: '/admin/discord/settings', roles: ['caster'] },
					{ title: 'Alerts', url: '/admin/discord/alerts' },
					{ title: 'Role Bestow', url: '/admin/discord/roles' },
				],
			},
			{
				title: 'Miscellaneous',
				url: '/admin/misc/settings',
				icon: Bot,
				roles: ['caster', 'moderator'],
				items: [
					{ title: 'Bot Settings', url: '/admin/misc/settings' },
					{ title: 'Migration', url: '/admin/misc/migration', roles: ['caster'] },
				],
			},

		],
	},
]

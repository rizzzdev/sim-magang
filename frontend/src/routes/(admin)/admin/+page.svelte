<script lang="ts">
	import { DashboardWelcome, MetricCard } from '$lib/components/molecules';
	import { ActivityFeed } from '$lib/components/molecules';
	import { apiClient } from '$lib/utils/api';
	import { formatFullName } from '$lib/utils/helpers';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	let stats = $state({
		totalStudents: 0,
		totalTeachers: 0,
		totalMentors: 0,
		totalCompanies: 0,
		totalPlacements: 0,
		activeStudents: 0,
		nonActiveStudents: 0
	});

	$effect(() => {
		apiClient('/api/v1/dashboard/admin').then(res => {
			if (res && !res.error && res.data) {
				stats = res.data;
			}
		}).catch(console.error);
	});
</script>

<svelte:head>
	<title>Admin Dashboard | SIM-Magang</title>
</svelte:head>

<DashboardWelcome 
	title={`SELAMAT DATANG, ${(formatFullName(data.profileData) || 'ADMIN').toUpperCase()}!`} 
	description="Kelola seluruh data master sistem informasi magang (Prakerin)." 
/>

<!-- Section: Pengguna Sistem -->
<div class="mt-8 mb-4 animate-fade-in-up" style="animation-delay: 0.1s; animation-fill-mode: both;">
	<h2 class="font-headline font-black text-2xl uppercase tracking-tight border-l-8 border-primary pl-4">Data Pengguna</h2>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up" style="animation-delay: 0.15s; animation-fill-mode: both;">
	<MetricCard title="Total Murid" value={stats.totalStudents} icon="school" variant="primary" />
	<MetricCard title="Total Guru" value={stats.totalTeachers} icon="person" variant="primary" />
	<MetricCard title="Total Mentor" value={stats.totalMentors} icon="badge" variant="primary" />
</div>

<!-- Section: Kemitraan & Penempatan -->
<div class="mt-8 mb-4 animate-fade-in-up" style="animation-delay: 0.2s; animation-fill-mode: both;">
	<h2 class="font-headline font-black text-2xl uppercase tracking-tight border-l-8 border-warning pl-4">Kemitraan & Penempatan</h2>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up" style="animation-delay: 0.25s; animation-fill-mode: both;">
	<MetricCard title="Mitra Industri" value={stats.totalCompanies} icon="domain" variant="warning" />
	<MetricCard title="Total Penempatan" value={stats.totalPlacements} icon="work" variant="primary" />
	<MetricCard title="Murid Magang Aktif" value={stats.activeStudents} icon="trending_up" variant="success" />
	<MetricCard title="Murid Non Magang" value={stats.nonActiveStudents} icon="pending_actions" variant="error" />
</div>

<!-- Admin: Semua Aktivitas Terbaru -->
<ActivityFeed role="admin" />

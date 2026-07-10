<script lang="ts">
	import { AuthLayout } from '$lib/components/templates';
	import { LoginForm } from '$lib/features/auth';
</script>

<svelte:head>
	<title>Login - SIM-Magang</title>
</svelte:head>

<AuthLayout>
	<LoginForm />
</AuthLayout>

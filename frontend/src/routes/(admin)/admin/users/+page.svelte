<script lang="ts">
  import {
    Pagination,
    Modal,
    FormField,
    ConfirmationModal,
    SearchFilter,
    Select,
    ImportModal,
  } from "$lib/components/molecules";
  import { Icon, Button, ActionButton, Checkbox } from "$lib/components/atoms";
  import { apiClient } from "$lib/utils/api";
  import { toast } from "$lib/stores/toast.svelte";
  import { untrack } from "svelte";
  import { formatFullName, getEmailFromUser } from "$lib/utils/helpers";

  let activeTab = $state<"student" | "teacher" | "mentor">("student");

  let currentPage = $state(1);
  let totalPages = $state(1);
  let loading = $state(true);
  let users = $state<any[]>([]);

  let showDeleteConfirm = $state(false);
  let selectedIdToDelete = $state("");

  // --- Student & Teacher State ---
  let showUserFormModal = $state(false);
  let userFormMode = $state<"create" | "edit">("create");
  let userFormType = $state<"student" | "teacher">("student");
  let isUserSubmitting = $state(false);

  let userFormId = $state("");
  let userFormName = $state("");
  let userFormEmail = $state("");
  let userFormPassword = $state("");
  let userFormNisn = $state("");
  let userFormClassName = $state("");
  let userFormMajor = $state("");
  let userFormNip = $state("");
  let userFormPrefixTitle = $state("");
  let userFormSuffixTitle = $state("");

  // --- Mentor Specific State ---
  let showImportModal = $state(false);

  let showFormModal = $state(false);
  let formMode = $state<"create" | "edit">("create");
  let isSubmitting = $state(false);

  let formId = $state("");
  let formName = $state("");
  let formEmail = $state("");
  let formPassword = $state("");
  let formPhone = $state("");
  let formPosition = $state("");
  let formCompanyId = $state("");
  let formPrefixTitle = $state("");
  let formSuffixTitle = $state("");
  
  let selectedMentors = $state<string[]>([]);
  let showBulkCompanyModal = $state(false);
  let bulkCompanyId = $state("");

  let companies = $state<any[]>([]);
  let searchQuery = $state("");

  async function fetchUsers(tab: string, page: number) {
    loading = true;
    let endpoint = "";
    if (tab === "student") endpoint = "/api/v1/students";
    else if (tab === "teacher") endpoint = "/api/v1/teachers";
    else if (tab === "mentor") endpoint = "/api/v1/industry-mentors";

    const currentSearch = untrack(() => searchQuery);
    const searchParam = currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : "";
    const res = await apiClient(`${endpoint}?page=${page}&limit=10${searchParam}`);
    if (res && !res.error) {
      users = res.data || [];
      if (res.pagination) {
        totalPages = res.pagination.totalPage || 1;
        currentPage = res.pagination.currentPage || 1;
      }
    } else {
      users = [];
      totalPages = 1;
    }
    loading = false;
  }

  async function fetchCompanies() {
    const res = await apiClient(`/api/v1/companies?limit=100`);
    if (res && !res.error) companies = res.data || [];
  }

  function openUserCreateModal(type: "student" | "teacher") {
    userFormMode = "create";
    userFormType = type;
    userFormId = "";
    userFormName = "";
    userFormEmail = "";
    userFormPassword = "";
    userFormNisn = "";
    userFormClassName = "";
    userFormMajor = "";
    userFormNip = "";
    userFormPrefixTitle = "";
    userFormSuffixTitle = "";
    showUserFormModal = true;
  }

  function openUserEditModal(type: "student" | "teacher", user: any) {
    userFormMode = "edit";
    userFormType = type;
    userFormId = user.id;
    userFormName = user.name || "";
    userFormEmail = getEmailFromUser(user.user) || "";
    userFormPassword = "";
    if (type === "student") {
      userFormNisn = user.nisn || "";
      userFormClassName = user.className || "";
      userFormMajor = user.major || "";
    } else {
      userFormNip = user.nip || "";
      userFormPrefixTitle = user.prefixTitle || "";
      userFormSuffixTitle = user.suffixTitle || "";
    }
    showUserFormModal = true;
  }

  async function handleUserSave() {
    const isStudent = userFormType === "student";

    if (!userFormName || !userFormEmail) {
      toast.error("Nama dan Email wajib diisi!");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userFormEmail)) {
      toast.error("Format email tidak valid!");
      return;
    }

    if (userFormMode === "create") {
      if (!userFormPassword) {
        toast.error("Password wajib diisi!");
        return;
      }
      if (userFormPassword.length < 8) {
        toast.error("Password minimal 8 karakter!");
        return;
      }
    } else if (userFormMode === "edit" && userFormPassword) {
      if (userFormPassword.length < 8) {
        toast.error("Password baru minimal 8 karakter!");
        return;
      }
    }

    isUserSubmitting = true;
    const payload: any = {
      name: userFormName,
      email: userFormEmail,
    };

    if (isStudent) {
      payload.nisn = userFormNisn || null;
      payload.className = userFormClassName || null;
      payload.major = userFormMajor || null;
    } else {
      payload.nip = userFormNip || null;
      payload.prefixTitle = userFormPrefixTitle || null;
      payload.suffixTitle = userFormSuffixTitle || null;
    }

    if (userFormMode === "create" && userFormPassword) {
      payload.password = userFormPassword;
    }

    const endpoint = isStudent ? "/api/v1/students" : "/api/v1/teachers";
    let url = endpoint;
    let method = "POST";

    if (userFormMode === "edit") {
      url = `${endpoint}/${userFormId}`;
      method = "PUT";
    }

    const res = await apiClient(url, { method, body: JSON.stringify(payload) });

    if (res && !res.error && userFormMode === "edit" && userFormPassword) {
      const resetRes = await apiClient(`${endpoint}/${userFormId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword: userFormPassword }),
      });
      if (resetRes?.error) {
        toast.error(resetRes.message || "Profil diperbarui, namun gagal mereset password!");
      }
    }

    isUserSubmitting = false;

    if (res && !res.error) {
      toast.success(
        userFormMode === "create"
          ? `${isStudent ? "Siswa" : "Guru"} berhasil ditambahkan!`
          : `${isStudent ? "Siswa" : "Guru"} berhasil diperbarui!`,
      );
      showUserFormModal = false;
      fetchUsers(activeTab, currentPage);
    } else {
      toast.error(res?.message || `Gagal menyimpan data ${isStudent ? "siswa" : "guru"}`);
    }
  }

  function confirmDelete(id: string) {
    selectedIdToDelete = id;
    showDeleteConfirm = true;
  }

  async function handleDelete() {
    showDeleteConfirm = false;
    let endpoint = "";
    if (activeTab === "student") endpoint = "/api/v1/students";
    else if (activeTab === "teacher") endpoint = "/api/v1/teachers";
    else if (activeTab === "mentor") endpoint = "/api/v1/industry-mentors";

    const res = await apiClient(`${endpoint}/${selectedIdToDelete}`, {
      method: "DELETE",
    });
    if (res && !res.error) {
      toast.success("Pengguna berhasil dihapus!");
      fetchUsers(activeTab, currentPage);
    } else {
      toast.error("Gagal menghapus pengguna");
    }
  }

  // --- Mentor Actions ---
  function openMentorCreateModal() {
    formMode = "create";
    formId = "";
    formName = "";
    formEmail = "";
    formPassword = "";
    formPhone = "";
    formPosition = "";
    formCompanyId = "";
    formPrefixTitle = "";
    formSuffixTitle = "";
    if (companies.length === 0) fetchCompanies();
    showFormModal = true;
  }

  function openMentorEditModal(mentor: any) {
    formMode = "edit";
    formId = mentor.id;
    formName = mentor.name || "";
    formEmail = getEmailFromUser(mentor.user) || "";
    formPassword = "";
    formPhone = mentor.phone || "";
    formPosition = mentor.position || "";
    formCompanyId = mentor.companyId || "";
    formPrefixTitle = mentor.prefixTitle || "";
    formSuffixTitle = mentor.suffixTitle || "";
    if (companies.length === 0) fetchCompanies();
    showFormModal = true;
  }

  async function handleMentorSave() {
    if (!formName || !formEmail) {
      toast.error("Nama dan Email wajib diisi!");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail)) {
      toast.error("Format email tidak valid!");
      return;
    }

    if (formMode === "create") {
      if (!formPassword) {
        toast.error("Password wajib diisi!");
        return;
      }
      if (formPassword.length < 8) {
        toast.error("Password minimal 8 karakter!");
        return;
      }
    } else if (formMode === "edit" && formPassword) {
      if (formPassword.length < 8) {
        toast.error("Password baru minimal 8 karakter!");
        return;
      }
    }

    isSubmitting = true;
    const payload: any = {
      name: formName,
      email: formEmail,
      phone: formPhone,
      position: formPosition,
      companyId: formCompanyId || undefined,
      prefixTitle: formPrefixTitle || undefined,
      suffixTitle: formSuffixTitle || undefined,
    };

    if (formMode === "create" && formPassword) {
      payload.password = formPassword;
    }

    let endpoint = "/api/v1/industry-mentors";
    let method = "POST";

    if (formMode === "edit") {
      endpoint = `/api/v1/industry-mentors/${formId}`;
      method = "PUT";
    }

    const res = await apiClient(endpoint, {
      method,
      body: JSON.stringify(payload),
    });

    if (res && !res.error && formMode === "edit" && formPassword) {
      const resetRes = await apiClient(
        `/api/v1/industry-mentors/${formId}/password`,
        {
          method: "PATCH",
          body: JSON.stringify({ newPassword: formPassword }),
        },
      );
      if (resetRes?.error) {
        toast.error(
          resetRes.message ||
            "Profil diperbarui, namun gagal mereset password!",
        );
      }
    }

    isSubmitting = false;

    if (res && !res.error) {
      toast.success(
        formMode === "create"
          ? "Mentor berhasil ditambahkan!"
          : "Mentor berhasil diperbarui!",
      );
      showFormModal = false;
      fetchUsers(activeTab, currentPage);
    } else {
      toast.error(res?.message || "Gagal menyimpan data mentor");
    }
  }

  function importEndpoint() {
    if (activeTab === "student") return "/api/v1/students";
    if (activeTab === "teacher") return "/api/v1/teachers";
    return "/api/v1/industry-mentors";
  }

  function importLabel() {
    if (activeTab === "student") return "Murid";
    if (activeTab === "teacher") return "Guru";
    return "Mentor";
  }

  function importColumnMapping() {
    if (activeTab === "student") {
      return { 'Nama Lengkap': 'name', 'Email': 'email', 'NISN': 'nisn', 'Kelas': 'className', 'Jurusan': 'major' };
    }
    if (activeTab === "teacher") {
      return { 'Nama Lengkap': 'name', 'Email': 'email', 'NIP': 'nip', 'Gelar Depan': 'prefixTitle', 'Gelar Belakang': 'suffixTitle' };
    }
    return { 'Nama Lengkap': 'name', 'Email': 'email', 'Posisi di Perusahaan': 'position', 'No. HP': 'phone', 'Gelar Depan': 'prefixTitle', 'Gelar Belakang': 'suffixTitle' };
  }

  function importTemplateFilename() {
    return `template-${importLabel().toLowerCase()}.xlsx`;
  }

  async function handleBulkEditCompany() {
    if (!bulkCompanyId) {
      toast.error("Pilih perusahaan terlebih dahulu!");
      return;
    }
    const res = await apiClient("/api/v1/industry-mentors/bulk/company", {
      method: "PUT",
      body: JSON.stringify({ ids: selectedMentors, companyId: bulkCompanyId }),
    });

    if (res && !res.error) {
      toast.success(res.message || "Berhasil memperbarui perusahaan mentor");
      showBulkCompanyModal = false;
      selectedMentors = [];
      fetchUsers(activeTab, currentPage);
    } else {
      toast.error(res?.message || "Gagal memperbarui perusahaan mentor");
    }
  }

  function handleSelectAll(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.checked) {
      selectedMentors = users.map((u) => u.id);
    } else {
      selectedMentors = [];
    }
  }

  function toggleSelection(id: string) {
    if (selectedMentors.includes(id)) {
      selectedMentors = selectedMentors.filter(i => i !== id);
    } else {
      selectedMentors = [...selectedMentors, id];
    }
  }

  $effect(() => {
    fetchUsers(activeTab, currentPage);
  });
</script>

<svelte:head>
  <title>Data Pengguna | SIM-Magang</title>
</svelte:head>

<div
  class="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6 animate-fade-in-up"
>
  <div>
    <h2 class="font-headline text-3xl font-black uppercase tracking-tight">
      Data Pengguna
    </h2>
    <p class="font-mono text-secondary mt-1">
      Kelola akun Murid, Guru, dan Mentor.
    </p>
  </div>
  <div class="flex flex-wrap gap-2">
    {#if activeTab === "student"}
      <Button variant="success" onclick={() => (showImportModal = true)}>
        <Icon name="upload_file" />
        <span>Import Murid</span>
      </Button>
      <Button variant="warning" onclick={() => openUserCreateModal("student")}>
        <Icon name="person_add" />
        <span>Tambah Murid</span>
      </Button>
    {:else if activeTab === "teacher"}
      <Button variant="success" onclick={() => (showImportModal = true)}>
        <Icon name="upload_file" />
        <span>Import Guru</span>
      </Button>
      <Button variant="warning" onclick={() => openUserCreateModal("teacher")}>
        <Icon name="person_add" />
        <span>Tambah Guru</span>
      </Button>
    {:else if activeTab === "mentor"}
      {#if selectedMentors.length > 0}
        <Button variant="primary" onclick={() => {
          if (companies.length === 0) fetchCompanies();
          showBulkCompanyModal = true;
        }}>
          <Icon name="business" />
          <span>Set Perusahaan ({selectedMentors.length})</span>
        </Button>
      {/if}
      <Button variant="success" onclick={() => (showImportModal = true)}>
        <Icon name="upload_file" />
        <span>Import Mentor</span>
      </Button>
      <Button variant="warning" onclick={openMentorCreateModal}>
        <Icon name="person_add" />
        <span>Tambah Mentor</span>
      </Button>
    {/if}
  </div>
</div>

<div class="animate-fade-in-up" style="animation-delay: 0.1s; animation-fill-mode: both;">
  <SearchFilter bind:searchQuery onSearch={() => { currentPage = 1; fetchUsers(activeTab, 1); }} placeholder={`Cari ${activeTab}...`} />
</div>

<div
  class="mb-4 flex border-b-4 border-on-background animate-fade-in-up"
  style="animation-delay: 0.1s; animation-fill-mode: both;"
>
  <button
    class="px-6 py-3 font-headline font-black uppercase text-sm border-r-4 border-t-4 border-l-4 border-on-background transition-all {activeTab ===
    'student'
      ? 'bg-primary text-on-background -mb-[4px]'
      : 'bg-slate-200 border-transparent text-secondary'}"
    onclick={() => {
      activeTab = "student";
      currentPage = 1;
    }}
  >
    Murid
  </button>
  <button
    class="px-6 py-3 font-headline font-black uppercase text-sm border-r-4 border-t-4 border-on-background transition-all {activeTab ===
    'teacher'
      ? 'bg-primary text-on-background -mb-[4px] border-l-4'
      : 'bg-slate-200 border-transparent text-secondary'}"
    onclick={() => {
      activeTab = "teacher";
      currentPage = 1;
    }}
  >
    Guru
  </button>
  <button
    class="px-6 py-3 font-headline font-black uppercase text-sm border-r-4 border-t-4 border-on-background transition-all {activeTab ===
    'mentor'
      ? 'bg-primary text-on-background -mb-[4px] border-l-4'
      : 'bg-slate-200 border-transparent text-secondary'}"
    onclick={() => {
      activeTab = "mentor";
      currentPage = 1;
    }}
  >
    Mentor
  </button>
</div>

<!-- Table -->
<div
  class="border-4 border-on-background bg-surface overflow-x-auto shadow-neo animate-fade-in-up"
  style="animation-delay: 0.2s; animation-fill-mode: both;"
>
  <table class="w-full text-left border-collapse min-w-[800px]">
    <thead>
      <tr
        class="border-b-4 border-on-background bg-slate-100 font-headline font-black uppercase text-sm"
      >
        {#if activeTab === "student"}
          <th class="p-4 border-r-4 border-on-background">Nama Lengkap</th>
          <th class="p-4 border-r-4 border-on-background">Email</th>
          <th class="p-4 border-r-4 border-on-background">NISN</th>
          <th class="p-4 border-r-4 border-on-background">Jurusan</th>
          <th class="p-4 border-r-4 border-on-background">Kelas</th>
          <th class="p-4 text-center">Aksi</th>
        {:else if activeTab === "teacher"}
          <th class="p-4 border-r-4 border-on-background"
            >Nama Lengkap (Gelar)</th
          >
          <th class="p-4 border-r-4 border-on-background">Email</th>
          <th class="p-4 border-r-4 border-on-background">NIP</th>
          <th class="p-4 text-center">Aksi</th>
        {:else if activeTab === "mentor"}
          <th class="p-4 border-r-4 border-on-background w-12 text-center align-middle">
            <Checkbox onchange={handleSelectAll} checked={selectedMentors.length === users.length && users.length > 0} />
          </th>
          <th class="p-4 border-r-4 border-on-background">Nama Mentor (Gelar)</th>
          <th class="p-4 border-r-4 border-on-background">Email</th>
          <th class="p-4 border-r-4 border-on-background">Perusahaan & Posisi</th>
          <th class="p-4 border-r-4 border-on-background">Telepon</th>
          <th class="p-4 text-center">Aksi</th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#if loading}
        <tr>
          <td colspan="6" class="p-8 text-center font-mono text-secondary"
            >Loading...</td
          >
        </tr>
      {:else if users.length === 0}
        <tr>
          <td colspan="6" class="p-8 text-center font-mono text-secondary"
            >Tidak ada data {activeTab}.</td
          >
        </tr>
      {:else}
        {#each users as user}
          <tr
            class="border-b-4 border-on-background hover:bg-blue-50 transition-colors"
          >
            {#if activeTab === "student"}
              <td class="p-4 border-r-4 border-on-background font-bold"
                >{user.name || "-"}</td
              >
              <td class="p-4 border-r-4 border-on-background font-mono text-sm"
                >{getEmailFromUser(user.user) || "-"}</td
              >
              <td class="p-4 border-r-4 border-on-background font-mono"
                >{user.nisn || "-"}</td
              >
              <td class="p-4 border-r-4 border-on-background"
                >{user.major || "-"}</td
              >
              <td class="p-4 border-r-4 border-on-background font-bold">{user.className || "-"}</td>
              <td class="p-4 text-center flex justify-center gap-2">
                <ActionButton
                  variant="secondary"
                  icon="edit"
                  label="Edit"
                  onclick={() => openUserEditModal("student", user)}
                />
                <ActionButton
                  variant="error"
                  icon="delete"
                  label="Hapus"
                  onclick={() => confirmDelete(user.id)}
                />
              </td>
            {:else if activeTab === "teacher"}
              <td class="p-4 border-r-4 border-on-background font-bold"
                >{formatFullName(user)}</td
              >
              <td class="p-4 border-r-4 border-on-background font-mono text-sm"
                >{getEmailFromUser(user.user) || "-"}</td
              >
              <td class="p-4 border-r-4 border-on-background font-mono">{user.nip || "-"}</td>
              <td class="p-4 text-center flex justify-center gap-2">
                <ActionButton
                  variant="secondary"
                  icon="edit"
                  label="Edit"
                  onclick={() => openUserEditModal("teacher", user)}
                />
                <ActionButton
                  variant="error"
                  icon="delete"
                  label="Hapus"
                  onclick={() => confirmDelete(user.id)}
                />
              </td>
            {:else if activeTab === "mentor"}
              <td class="p-4 border-r-4 border-on-background text-center align-middle">
                <Checkbox checked={selectedMentors.includes(user.id)} onchange={() => toggleSelection(user.id)} />
              </td>
              <td class="p-4 border-r-4 border-on-background font-bold"
                >{formatFullName(user)}</td
              >
              <td class="p-4 border-r-4 border-on-background font-mono text-sm"
                >{getEmailFromUser(user.user) || "-"}</td
              >
              <td class="p-4 border-r-4 border-on-background">
                <div class="flex flex-col">
                  <span class="font-bold">{user.company?.name || "Tanpa Perusahaan"}</span>
                  <span class="text-secondary text-sm">{user.position || "-"}</span>
                </div>
              </td>
              <td class="p-4 border-r-4 border-on-background font-mono text-sm"
                >{user.phone || "-"}</td
              >
              <td class="p-4 text-center flex justify-center gap-2">
                <ActionButton
                  variant="secondary"
                  icon="edit"
                  label="Edit"
                  onclick={() => openMentorEditModal(user)}
                />
                <ActionButton
                  variant="error"
                  icon="delete"
                  label="Hapus"
                  onclick={() => confirmDelete(user.id)}
                />
              </td>
            {/if}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<div
  class="mt-6 flex justify-end animate-fade-in-up"
  style="animation-delay: 0.3s; animation-fill-mode: both;"
>
  <Pagination bind:currentPage {totalPages} />
</div>

<!-- Modal Create / Edit Mentor -->
<Modal
  bind:show={showFormModal}
  title={formMode === "create" ? "Tambah Mentor" : "Edit Mentor"}
>
  <div class="space-y-4 font-mono">
    <FormField id="mentor-name" label="Nama Lengkap *">
      <input
        type="text"
        id="mentor-name"
        bind:value={formName}
        placeholder="Bapak Anton"
        class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
      />
    </FormField>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField id="mentor-prefix-title" label="Gelar Depan">
        <input
          type="text"
          id="mentor-prefix-title"
          bind:value={formPrefixTitle}
          placeholder="Dr."
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
      <FormField id="mentor-suffix-title" label="Gelar Belakang">
        <input
          type="text"
          id="mentor-suffix-title"
          bind:value={formSuffixTitle}
          placeholder="S.Kom."
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField id="mentor-email" label="Email Akun *">
        <input
          type="email"
          id="mentor-email"
          bind:value={formEmail}
          placeholder="anton@company.com"
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
      <FormField
        id="mentor-password"
        label={formMode === "create" ? "Password *" : "Reset Password (Opsional)"}
      >
        <input
          type="password"
          id="mentor-password"
          bind:value={formPassword}
          placeholder={formMode === "create"
            ? "Minimal 8 karakter"
            : "Isi untuk mereset password secara paksa"}
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField id="mentor-phone" label="No. Telepon">
        <input
          type="tel"
          id="mentor-phone"
          bind:value={formPhone}
          placeholder="081234567890"
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
      <FormField id="mentor-position" label="Posisi / Jabatan">
        <input
          type="text"
          id="mentor-position"
          bind:value={formPosition}
          placeholder="Senior Developer"
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
    </div>
    <FormField id="mentor-company" label="Perusahaan Mitra">
      <Select
        id="mentor-company"
        options={companies.map(c => ({ label: c.name, value: c.id }))}
        bind:value={formCompanyId}
        placeholder="-- Pilih Perusahaan --"
      />
    </FormField>

    <div class="pt-4 flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (showFormModal = false)}
        >Batal</Button
      >
      <Button
        variant="success"
        onclick={handleMentorSave}
        disabled={isSubmitting}
      >
        {#if isSubmitting}
          Menyimpan...
        {:else}
          <Icon name="save" />
          <span>Simpan</span>
        {/if}
      </Button>
    </div>
  </div>
</Modal>

<ImportModal
  bind:show={showImportModal}
  title="Import Excel"
  label={importLabel()}
  endpoint={importEndpoint()}
  templateEndpoint={`${importEndpoint()}/excel/template`}
  templateFilename={importTemplateFilename()}
  columnMapping={{...importColumnMapping(), Password: 'password'}}
  onSuccess={() => fetchUsers(activeTab, currentPage)}
/>

<ConfirmationModal
  bind:show={showDeleteConfirm}
  title="Hapus Pengguna"
  message={activeTab === "mentor"
    ? "Apakah Anda yakin ingin menghapus mentor ini? Akun otentikasinya di Auth Server juga akan terhapus permanen."
    : "Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan."}
  type="danger"
  confirmText="Ya, Hapus"
  onConfirm={handleDelete}
/>

<Modal bind:show={showBulkCompanyModal} title="Set Perusahaan Mentor">
  <div class="space-y-4 font-mono">
    <FormField id="mentor-name" label="Nama Lengkap *">
      <input
        type="text"
        id="mentor-name"
        bind:value={formName}
        placeholder="Bapak Anton"
        class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
      />
    </FormField>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField id="mentor-prefix-title" label="Gelar Depan">
        <input
          type="text"
          id="mentor-prefix-title"
          bind:value={formPrefixTitle}
          placeholder="Dr."
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
      <FormField id="mentor-suffix-title" label="Gelar Belakang">
        <input
          type="text"
          id="mentor-suffix-title"
          bind:value={formSuffixTitle}
          placeholder="S.Kom."
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField id="mentor-email" label="Email Akun *">
        <input
          type="email"
          id="mentor-email"
          bind:value={formEmail}
          placeholder="anton@company.com"
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
      <FormField
        id="mentor-password"
        label={formMode === "create" ? "Password *" : "Reset Password (Opsional)"}
      >
        <input
          type="password"
          id="mentor-password"
          bind:value={formPassword}
          placeholder={formMode === "create"
            ? "Minimal 8 karakter"
            : "Isi untuk mereset password secara paksa"}
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField id="mentor-phone" label="No. Telepon">
        <input
          type="tel"
          id="mentor-phone"
          bind:value={formPhone}
          placeholder="081234567890"
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
      <FormField id="mentor-position" label="Posisi / Jabatan">
        <input
          type="text"
          id="mentor-position"
          bind:value={formPosition}
          placeholder="Senior Developer"
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
    </div>
    <FormField id="mentor-company" label="Perusahaan Mitra">
      <select
        id="mentor-company"
        bind:value={formCompanyId}
        class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
      >
        <option value="">-- Pilih Perusahaan --</option>
        {#each companies as company}
          <option value={company.id}>{company.name}</option>
        {/each}
      </select>
    </FormField>

    <div class="pt-4 flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (showBulkCompanyModal = false)}
        >Batal</Button
      >
      <Button variant="success" onclick={handleBulkEditCompany}>
        <Icon name="save" />
        <span>Simpan Perubahan</span>
      </Button>
    </div>
  </div>
</Modal>

<!-- Modal Create / Edit Student & Teacher -->
<Modal
  bind:show={showUserFormModal}
  title={userFormMode === "create"
    ? `Tambah ${userFormType === "student" ? "Murid" : "Guru"}`
    : `Edit ${userFormType === "student" ? "Murid" : "Guru"}`}
>
  <div class="space-y-4 font-mono">
    <FormField id="user-name" label="Nama Lengkap *">
      <input
        type="text"
        id="user-name"
        bind:value={userFormName}
        placeholder="Nama lengkap"
        class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
      />
    </FormField>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField id="user-email" label="Email Akun *">
        <input
          type="email"
          id="user-email"
          bind:value={userFormEmail}
          placeholder="nama@email.com"
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
      <FormField
        id="user-password"
        label={userFormMode === "create" ? "Password *" : "Reset Password (Opsional)"}
      >
        <input
          type="password"
          id="user-password"
          bind:value={userFormPassword}
          placeholder={userFormMode === "create"
            ? "Minimal 8 karakter"
            : "Isi untuk mereset password"}
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
    </div>

    {#if userFormType === "student"}
      <FormField id="user-nisn" label="NISN">
        <input
          type="text"
          id="user-nisn"
          bind:value={userFormNisn}
          placeholder="Nomor NISN"
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField id="user-class" label="Kelas">
          <input
            type="text"
            id="user-class"
            bind:value={userFormClassName}
            placeholder="XII RPL 1"
            class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
          />
        </FormField>
        <FormField id="user-major" label="Jurusan">
          <input
            type="text"
            id="user-major"
            bind:value={userFormMajor}
            placeholder="Rekayasa Perangkat Lunak"
            class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
          />
        </FormField>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField id="user-prefix-title" label="Gelar Depan">
          <input
            type="text"
            id="user-prefix-title"
            bind:value={userFormPrefixTitle}
            placeholder="Dr."
            class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
          />
        </FormField>
        <FormField id="user-suffix-title" label="Gelar Belakang">
          <input
            type="text"
            id="user-suffix-title"
            bind:value={userFormSuffixTitle}
            placeholder="S.Pd."
            class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
          />
        </FormField>
      </div>
      <FormField id="user-nip" label="NIP">
        <input
          type="text"
          id="user-nip"
          bind:value={userFormNip}
          placeholder="Nomor NIP"
          class="w-full border-4 border-on-background bg-surface p-3 font-mono text-on-background focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all shadow-neo-sm"
        />
      </FormField>
    {/if}

    <div class="pt-4 flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (showUserFormModal = false)}
        >Batal</Button
      >
      <Button
        variant="success"
        onclick={handleUserSave}
        disabled={isUserSubmitting}
      >
        {#if isUserSubmitting}
          Menyimpan...
        {:else}
          <Icon name="save" />
          <span>Simpan</span>
        {/if}
      </Button>
    </div>
  </div>
</Modal>

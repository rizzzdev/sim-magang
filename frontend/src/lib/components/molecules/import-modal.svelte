<script lang="ts">
  import { Modal, FormField } from "$lib/components/molecules";
  import { Icon, Button } from "$lib/components/atoms";
  import { apiClient } from "$lib/utils/api";
  import { downloadBlob } from "$lib/utils/download";
  import { toast } from "$lib/stores/toast.svelte";
  import { read, utils } from "xlsx";

  let {
    show = $bindable(false),
    title,
    label,
    endpoint,
    templateEndpoint,
    templateFilename,
    columnMapping,
    onSuccess,
  }: {
    show: boolean;
    title: string;
    label: string;
    endpoint: string;
    templateEndpoint: string;
    templateFilename: string;
    columnMapping: Record<string, string>;
    onSuccess?: () => void;
  } = $props();

  let importFile = $state<File | null>(null);
  let isImporting = $state(false);
  let fileInput = $state<HTMLInputElement>();
  let previewData = $state<any[]>([]);

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      importFile = target.files[0];
      try {
        const data = await importFile.arrayBuffer();
        const workbook = read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = utils.sheet_to_json(sheet);

        previewData = rows
          .map((row) => {
            const mapped: any = {};
            for (const [excelCol, field] of Object.entries(columnMapping)) {
              mapped[field] = row[excelCol]?.toString().trim() || null;
            }
            mapped.password = row["Password"]?.toString() || "password123";
            return mapped;
          })
          .filter((row) => row.name);

        if (previewData.length === 0) {
          toast.error("Format tidak sesuai atau data kosong");
          importFile = null;
        }
      } catch {
        toast.error("Gagal membaca file excel");
        importFile = null;
      }
    }
  }

  async function handleImport() {
    if (previewData.length === 0) {
      toast.error("Tidak ada data untuk diimpor");
      return;
    }
    isImporting = true;
    const res = await apiClient(`${endpoint}/bulk`, {
      method: "POST",
      body: JSON.stringify(previewData),
    });
    isImporting = false;
    if (res && !res.error) {
      toast.success(res.message || `Berhasil mengimpor ${label}`);
      show = false;
      importFile = null;
      previewData = [];
      onSuccess?.();
    } else {
      toast.error(res?.message || `Gagal mengimpor ${label}`);
    }
  }

  async function downloadTemplate() {
    try {
      await downloadBlob(templateEndpoint, templateFilename);
    } catch {
      toast.error(`Gagal mendownload template ${label}`);
    }
  }

  function reset() {
    show = false;
    importFile = null;
    previewData = [];
  }
</script>

<Modal bind:show={show} title={previewData.length > 0 ? `Pratinjau Data ${label}` : `Import Excel ${label}`}>
  {#if previewData.length === 0}
    <div class="space-y-4 font-mono text-center">
      <div class="border-4 border-dashed border-on-background p-8">
        <Icon name="upload_file" class="text-4xl mb-2" />
        <p class="mb-4">Pilih file Excel untuk diimport</p>
        <input type="file" accept=".xlsx,.xls" onchange={handleFileSelect} class="hidden" bind:this={fileInput} />
        <Button variant="primary" onclick={() => fileInput?.click()}>
          <Icon name="file_upload" />
          <span>Pilih File</span>
        </Button>
      </div>
      <Button variant="secondary" onclick={downloadTemplate}>
        <Icon name="download" />
        <span>Download Template</span>
      </Button>
    </div>
  {:else}
    <div class="space-y-4 font-mono">
      <div class="overflow-x-auto border-4 border-on-background">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b-4 border-on-background bg-slate-100 font-headline font-black uppercase text-sm">
              {#each Object.keys(previewData[0]) as col}
                <th class="p-2 border-r-2 border-on-background">{col}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each previewData.slice(0, 5) as row}
              <tr class="border-b-2 border-on-background">
                {#each Object.values(row) as val}
                  <td class="p-2 border-r-2 border-on-background font-mono text-sm">{String(val || "-")}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="text-secondary text-sm">Menampilkan {Math.min(5, previewData.length)} dari {previewData.length} data</p>
      <div class="pt-4 flex justify-end gap-2">
        <Button variant="secondary" onclick={reset}>Batal</Button>
        <Button variant="success" onclick={handleImport} disabled={isImporting}>
          {#if isImporting}
            Menyimpan...
          {:else}
            <Icon name="save" />
            <span>Konfirmasi Simpan</span>
          {/if}
        </Button>
      </div>
    </div>
  {/if}
</Modal>

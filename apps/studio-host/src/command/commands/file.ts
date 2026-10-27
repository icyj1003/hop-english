import { fileCommands as upstreamFileCommands } from '@/upstream/commands';
import type { CommandDef, CommandServices } from '@/upstream/commands';
import type { DesktopBridgeApi } from '@/core/tauri-bridge';
import { openPrintDialog } from '@/ui/print-dialog';
import { openRecentDocumentsDialog } from '@/ui/recent-documents-dialog';
import { replaceUpstreamCommands } from '../replace-upstream-commands';

type DesktopFileBridge = Pick<
  DesktopBridgeApi,
  | 'openDocumentFromDialog'
  | 'createNewWindow'
  | 'saveDocumentFromCommand'
  | 'saveDocumentAsFromCommand'
  | 'exportPdfFromCommand'
  | 'printCurrentWebview'
>;

type DesktopRecentBridge = Pick<
  DesktopBridgeApi,
  | 'openDocumentByPath'
  | 'listRecentDocuments'
  | 'clearRecentDocuments'
>;

const upstreamById = new Map(upstreamFileCommands.map((command) => [command.id, command]));
// HOP owns save format choices and PDF export through native paths. Browser-only
// commands must be reviewed explicitly instead of arriving through group merge.
const browserOnlyFileCommands = new Set([
  'file:save-as-hwp',
  'file:save-as-hwpx',
  'file:print-to-pdf',
  'file:export-html',
  'file:export-doc',
]);
const adoptedUpstreamCommands = upstreamFileCommands.filter(
  (command) => !browserOnlyFileCommands.has(command.id),
);

function desktopBridge(wasm: unknown): DesktopFileBridge | null {
  if (!wasm || typeof wasm !== 'object') return null;
  const candidate = wasm as Partial<DesktopFileBridge>;
  return typeof candidate.openDocumentFromDialog === 'function'
    && typeof candidate.createNewWindow === 'function'
    && typeof candidate.saveDocumentFromCommand === 'function'
    && typeof candidate.saveDocumentAsFromCommand === 'function'
    && typeof candidate.exportPdfFromCommand === 'function'
    && typeof candidate.printCurrentWebview === 'function'
    ? candidate as DesktopFileBridge
    : null;
}

function recentBridge(wasm: unknown): DesktopRecentBridge | null {
  if (!wasm || typeof wasm !== 'object') return null;
  const candidate = wasm as Partial<DesktopRecentBridge>;
  return typeof candidate.openDocumentByPath === 'function'
    && typeof candidate.listRecentDocuments === 'function'
    && typeof candidate.clearRecentDocuments === 'function'
    ? candidate as DesktopRecentBridge
    : null;
}

function upstream(id: string): CommandDef {
  const command = upstreamById.get(id);
  if (!command) throw new Error(`Upstream file command is missing: ${id}`);
  return command;
}

function withDesktopOverride(id: string, execute: CommandDef['execute']): CommandDef {
  return {
    ...upstream(id),
    execute,
  };
}

function emitStatus(services: CommandServices, message: string): void {
  services.eventBus.emit('desktop-status', message);
}

function reportCommandError(services: CommandServices, action: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  emitStatus(services, `${action} failed: ${message}`);
  alert(`${action} failed:\n${message}`);
}

async function runDesktopAction(
  services: CommandServices,
  action: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    reportCommandError(services, action, error);
  }
}

const desktopCommands = new Map<string, CommandDef>([
  ['file:open', withDesktopOverride('file:open', async (services) => {
    const desktop = desktopBridge(services.wasm);
    if (!desktop) return upstream('file:open').execute(services);

    await runDesktopAction(services, 'Open File', async () => {
      const payload = await desktop.openDocumentFromDialog();
      if (payload) services.eventBus.emit('desktop-document-loaded', payload);
    });
  })],
  ['file:open-recent', withDesktopOverride('file:open-recent', async (services) => {
    const desktop = recentBridge(services.wasm);
    if (!desktop) return upstream('file:open-recent').execute(services);

    await runDesktopAction(services, 'Open Recent Document', async () => {
      const documents = await desktop.listRecentDocuments();
      if (documents.length === 0) {
        emitStatus(services, 'No recent documents');
        alert('No recent documents.');
        return;
      }

      const selected = await openRecentDocumentsDialog(documents, {
        clearRecentDocuments: () => desktop.clearRecentDocuments(),
      });
      if (!selected) {
        emitStatus(services, 'Recent documents list closed');
        return;
      }

      emitStatus(services, 'Loading file...');
      const payload = await desktop.openDocumentByPath(selected.path);
      if (payload) services.eventBus.emit('desktop-document-loaded', payload);
    });
  })],
  ['file:clear-recent', withDesktopOverride('file:clear-recent', async (services) => {
    const desktop = recentBridge(services.wasm);
    if (!desktop) return upstream('file:clear-recent').execute(services);

    await runDesktopAction(services, 'Clear Recent Documents', async () => {
      await desktop.clearRecentDocuments();
      emitStatus(services, 'Recent documents cleared');
    });
  })],
  ['file:save', withDesktopOverride('file:save', async (services) => {
    const desktop = desktopBridge(services.wasm);
    if (!desktop) return upstream('file:save').execute(services);

    await runDesktopAction(services, 'Save', async () => {
      emitStatus(services, 'Saving...');
      const result = await desktop.saveDocumentFromCommand();
      if (result) {
        services.eventBus.emit('desktop-document-saved', result);
        emitStatus(services, 'Saved');
      }
    });
  })],
  ['file:save-as', withDesktopOverride('file:save-as', async (services) => {
    const desktop = desktopBridge(services.wasm);
    if (!desktop) return upstream('file:save-as').execute(services);

    await runDesktopAction(services, 'Save As', async () => {
      emitStatus(services, 'Saving as...');
      const result = await desktop.saveDocumentAsFromCommand();
      if (result) {
        services.eventBus.emit('desktop-document-saved', result);
        emitStatus(services, 'Saved');
      }
    });
  })],
  ['file:print', withDesktopOverride('file:print', async (services) => {
    const statusEl = document.getElementById('sb-message');
    const previousStatus = statusEl?.textContent || '';
    const desktop = desktopBridge(services.wasm);

    try {
      await openPrintDialog(services.wasm, {
        onStatus: (message) => {
          if (statusEl) statusEl.textContent = message;
          emitStatus(services, message);
        },
        print: desktop ? () => desktop.printCurrentWebview() : undefined,
      });
      if (statusEl) statusEl.textContent = previousStatus;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (statusEl) statusEl.textContent = `Print failed: ${message}`;
      alert(`Print failed:\n${message}`);
    }
  })],
]);

const hopOnlyCommands: CommandDef[] = [
  {
    id: 'file:new-window',
    label: 'New Window',
    shortcutLabel: 'Ctrl+Shift+N',
    async execute(services) {
      const desktop = desktopBridge(services.wasm);
      if (!desktop) {
        window.open(window.location.href, '_blank');
        return;
      }
      await runDesktopAction(services, 'Open New Window', () => desktop.createNewWindow());
    },
  },
  {
    id: 'file:export-pdf',
    label: 'Export PDF',
    canExecute: (ctx) => ctx.hasDocument,
    async execute(services) {
      const desktop = desktopBridge(services.wasm);
      if (!desktop) {
        alert('PDF export is supported in the HOP desktop app.');
        return;
      }

      await runDesktopAction(services, 'Export PDF', async () => {
        emitStatus(services, 'Exporting PDF...');
        const jobId = await desktop.exportPdfFromCommand();
        if (jobId) emitStatus(services, 'PDF export complete');
      });
    },
  },
];

export const fileCommands: CommandDef[] = [
  ...replaceUpstreamCommands(adoptedUpstreamCommands, [...desktopCommands.values()]),
  ...hopOnlyCommands,
];

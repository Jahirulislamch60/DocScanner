import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { ScanDocument, Folder } from "@/types";

const INDEX_KEY = "docscanner:documents";
const FOLDERS_KEY = "docscanner:folders";
export const DOCS_DIR = FileSystem.documentDirectory + "docscanner/";

/** Make sure the app's private documents folder exists. */
export async function ensureDocsDir() {
  const info = await FileSystem.getInfoAsync(DOCS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOCS_DIR, { intermediates: true });
  }
}

async function readIndex(): Promise<ScanDocument[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ScanDocument[];
  } catch {
    return [];
  }
}

async function writeIndex(docs: ScanDocument[]) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(docs));
}

export async function listDocuments(): Promise<ScanDocument[]> {
  const docs = await readIndex();
  return docs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDocument(id: string): Promise<ScanDocument | undefined> {
  const docs = await readIndex();
  return docs.find((d) => d.id === id);
}

export async function saveDocument(doc: ScanDocument): Promise<void> {
  const docs = await readIndex();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    docs[idx] = doc;
  } else {
    docs.push(doc);
  }
  await writeIndex(docs);
}

export async function deleteDocument(id: string): Promise<void> {
  const docs = await readIndex();
  const doc = docs.find((d) => d.id === id);
  await writeIndex(docs.filter((d) => d.id !== id));
  if (doc) {
    // best-effort cleanup of files on disk
    await Promise.all(
      doc.pages.map((p) =>
        FileSystem.deleteAsync(p.uri, { idempotent: true }).catch(() => {})
      )
    );
    if (doc.pdfUri) {
      await FileSystem.deleteAsync(doc.pdfUri, { idempotent: true }).catch(() => {});
    }
  }
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---- Folders ----

async function readFolders(): Promise<Folder[]> {
  const raw = await AsyncStorage.getItem(FOLDERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Folder[];
  } catch {
    return [];
  }
}

async function writeFolders(folders: Folder[]) {
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

export async function listFolders(): Promise<Folder[]> {
  const folders = await readFolders();
  return folders.sort((a, b) => a.name.localeCompare(b.name, "bn"));
}

export async function createFolder(name: string): Promise<Folder> {
  const folders = await readFolders();
  const folder: Folder = { id: newId(), name, createdAt: Date.now() };
  folders.push(folder);
  await writeFolders(folders);
  return folder;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const folders = await readFolders();
  const idx = folders.findIndex((f) => f.id === id);
  if (idx >= 0) {
    folders[idx] = { ...folders[idx], name };
    await writeFolders(folders);
  }
}

/** Deletes a folder and un-files any documents inside it (they are not deleted). */
export async function deleteFolder(id: string): Promise<void> {
  const folders = await readFolders();
  await writeFolders(folders.filter((f) => f.id !== id));

  const docs = await readIndex();
  const updated = docs.map((d) =>
    d.folderId === id ? { ...d, folderId: undefined } : d
  );
  await writeIndex(updated);
}

export async function moveDocumentToFolder(
  docId: string,
  folderId: string | undefined
): Promise<void> {
  const docs = await readIndex();
  const idx = docs.findIndex((d) => d.id === docId);
  if (idx >= 0) {
    docs[idx] = { ...docs[idx], folderId, updatedAt: Date.now() };
    await writeIndex(docs);
  }
}

export async function listDocumentsInFolder(
  folderId: string | undefined
): Promise<ScanDocument[]> {
  const docs = await listDocuments();
  return docs.filter((d) => (d.folderId ?? undefined) === folderId);
}

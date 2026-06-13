export interface Record {
  id: string;
  user_id: string;
  title: string;
  ciphertext: string;
  nonce: string;
  salt: string;
  alg_version: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface RecordCreate {
  title: string;
  secret: string;
  tags?: string[];
}

export interface RecordListItem {
  id: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Export payload: one record in encrypted form (base64 fields),
 * suitable for backup / migration.
 */
export interface ExportPayload {
  version: number;
  exported_at: string;
  records: ExportRecord[];
}

export interface ExportRecord {
  id: string;
  title: string;
  ciphertext: string;
  nonce: string;
  salt: string;
  alg_version: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

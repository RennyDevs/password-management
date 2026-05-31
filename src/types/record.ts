export interface Record {
  id: string;
  user_id: string;
  title: string;
  ciphertext: string;
  nonce: string;
  salt: string;
  alg_version: string;
  created_at: string;
  updated_at: string;
}

export interface RecordCreate {
  title: string;
  secret: string;
}

export interface RecordListItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

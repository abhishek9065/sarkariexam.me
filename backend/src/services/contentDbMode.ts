export type ContentDbMode = 'postgres';

export function getContentDbMode(): ContentDbMode {
  return 'postgres';
}

export function isPostgresPrimaryMode(): boolean {
  return true;
}

export function isDualWriteMode(): boolean {
  return false;
}

export function shouldReadFromPostgres(): boolean {
  return true;
}

export async function loadDesktopModule<T = any>(moduleName: string): Promise<T> {
  const dynamicImport = new Function("m", "return import(m);") as (m: string) => Promise<T>;
  return dynamicImport(moduleName);
}


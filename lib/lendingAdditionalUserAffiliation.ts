/** 代表利用者と追加利用者の所属（企業名・部署名）が一致するか */
export function isSameAffiliation(
  rep: { userCompanyName: string; userDepartmentName: string },
  add: { userCompanyName: string; userDepartmentName: string },
): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ");
  return (
    norm(rep.userCompanyName) === norm(add.userCompanyName) &&
    norm(rep.userDepartmentName) === norm(add.userDepartmentName)
  );
}

export function affiliationWarningMessage(
  addName: string,
  rep: { userCompanyName: string; userDepartmentName: string },
  add: { userCompanyName: string; userDepartmentName: string },
): string {
  return `追加利用者「${addName}」の所属（${add.userCompanyName.trim()} / ${add.userDepartmentName.trim()}）が代表利用者（${rep.userCompanyName.trim()} / ${rep.userDepartmentName.trim()}）と一致しません。`;
}

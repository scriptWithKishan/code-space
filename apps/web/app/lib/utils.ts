export function isWorkspaceAdmin(user: any, workspace: any): boolean {
  if (!user || !workspace) return false;

  const userIdStr = String(user.id || user._id || '');
  if (!userIdStr) return false;

  const ownerIdStr = String(
    typeof workspace.ownerId === 'object' && workspace.ownerId !== null
      ? workspace.ownerId._id || workspace.ownerId.id || workspace.ownerId
      : workspace.ownerId || '',
  );

  if (ownerIdStr === userIdStr) return true;

  if (Array.isArray(workspace.members)) {
    return workspace.members.some((m: any) => {
      const memberUserIdStr = String(
        typeof m.userId === 'object' && m.userId !== null
          ? m.userId._id || m.userId.id || m.userId
          : m.userId || '',
      );
      return memberUserIdStr === userIdStr && m.role === 'ADMIN';
    });
  }

  return false;
}

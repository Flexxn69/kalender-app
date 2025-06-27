// Avatar-URL-Helper
export function getAvatarUrl(user: { avatar?: string, email: string }) {
  if (user.avatar) return user.avatar;
  // Fallback: Gravatar
  const hash = md5(user.email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
}

function md5(str: string) {
  // Dummy-Hash für Demo (in Produktion: echtes md5!)
  let hash = 0, i, chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

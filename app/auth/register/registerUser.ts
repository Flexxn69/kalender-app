export async function registerUser(name: string, email: string, password: string, phone: string) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, phone })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Registrierung fehlgeschlagen");
  }
  return await res.json();
}

/** SHA-256 s pevnou solí. Na ochranu jednoho sdíleného hesla ke školicí
 *  hře to stačí. Heslo se nikdy neukládá v čitelné podobě. */
const SALT = 'playground.v1'

export async function hashSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + ':' + secret.trim())
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

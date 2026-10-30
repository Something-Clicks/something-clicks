import { sql } from "@/lib/db";

export type InviteAudience = { slug: string; name: string; with_email: number; listed: number };

/** Per active metro: wedding-specific listings nobody has claimed, and how many have an imported email. Never sent anything. */
export async function inviteAudience(): Promise<InviteAudience[]> {
  return sql()<InviteAudience[]>`
    select cl.slug, cl.name,
           count(*) filter (where p.email <> '' and not exists (
             select 1 from suppression s where s.kind = 'email' and s.value = lower(p.email)))::int as with_email,
           count(*)::int as listed
    from clusters cl
    join places p on st_intersects(p.geog, cluster_box(cl))
    join categories c on c.id = p.category_id
    where cl.scope = 'metro' and cl.status = 'active' and not c.broad
      and p.state = 'listed' and not p.suppressed and not p.stale
    group by cl.id order by cl.name`;
}

export type InviteSample = { id: number; name: string; locality: string; count: number; examples: string[] };

/** Short names for a sentence like "including planners, venues and photographers". */
const SHORT: Record<string, string> = {
  wedding_venues: "venues", wedding_planners: "planners", bridal_shops: "bridal shops", stationers: "stationers",
  djs_music: "DJs", event_rentals: "rental companies", limos: "limo services", hair_makeup: "hair and makeup artists",
};

export const shortPlural = (categoryId: string, plural: string) => SHORT[categoryId] ?? plural;

/** A real listed business to preview the cluster invitation with: its live match count and top matching categories. */
export async function inviteSample(clusterSlug: string): Promise<InviteSample | null> {
  const [row] = await sql()<InviteSample[]>`
    with pick as (
      select p.id, p.name, p.locality from clusters cl
      join places p on st_intersects(p.geog, cluster_box(cl))
      where cl.slug = ${clusterSlug} and p.state = 'listed' and p.email <> '' and not p.suppressed and p.locality <> ''
        and exists (select 1 from matches m where m.place_a = p.id)
      order by p.id limit 1
    )
    select pick.id::int, pick.name, pick.locality,
           (select count(*)::int from matches m where m.place_a = pick.id and m.status <> 'hidden') as count,
           array(select c.id from matches m join places b on b.id = m.place_b join categories c on c.id = b.category_id
                 where m.place_a = pick.id and m.status <> 'hidden'
                 group by c.id order by count(*) desc, c.id limit 3) as examples
    from pick`;
  if (!row) return null;
  const { categoryById } = await import("@/content/journeys");
  return { ...row, examples: row.examples.map((id) => shortPlural(id, categoryById(id)?.plural.toLowerCase() ?? id)) };
}

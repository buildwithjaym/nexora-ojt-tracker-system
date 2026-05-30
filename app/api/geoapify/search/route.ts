import { NextResponse } from "next/server";

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

const BASILAN_LNG = 121.971;
const BASILAN_LAT = 6.7081;

function expandQuery(query: string) {
  const q = query.trim();

  if (/^dict/i.test(q)) {
    return [
      q,
      q.replace(/^dict/i, "Department of Information and Communications Technology"),
      `DICT ${q} Philippines`,
      `Department of Information and Communications Technology ${q} Philippines`,
    ];
  }

  if (/^psa/i.test(q)) {
    return [
      q,
      q.replace(/^psa/i, "Philippine Statistics Authority"),
      `PSA ${q} Philippines`,
      `Philippine Statistics Authority ${q} Philippines`,
    ];
  }

  if (/^deped/i.test(q)) {
    return [
      q,
      q.replace(/^deped/i, "Department of Education"),
      `DepEd ${q} Philippines`,
      `Department of Education ${q} Philippines`,
    ];
  }

  return [
    q,
    `${q} Basilan Philippines`,
    `${q} Isabela City Basilan Philippines`,
  ];
}

export async function GET(request: Request) {
  if (!GEOAPIFY_API_KEY) {
    return NextResponse.json(
      { message: "Missing GEOAPIFY_API_KEY." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text")?.trim();

  if (!text) {
    return NextResponse.json({ features: [] });
  }

  const attempts = Array.from(new Set(expandQuery(text)));
  const collected: any[] = [];

  for (const attempt of attempts) {
    const params = new URLSearchParams({
      text: attempt,
      format: "geojson",
      limit: "6",
      lang: "en",
      filter: "countrycode:ph",
      bias: `proximity:${BASILAN_LNG},${BASILAN_LAT}`,
      apiKey: GEOAPIFY_API_KEY,
    });

    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/search?${params.toString()}`,
      { cache: "no-store" }
    );

    if (!res.ok) continue;

    const data = await res.json();
    const features = Array.isArray(data.features) ? data.features : [];

    collected.push(...features);

    if (collected.length >= 5) break;
  }

  const seen = new Set();

  const features = collected.filter((feature) => {
    const coords = feature?.geometry?.coordinates;
    const name = feature?.properties?.formatted ?? "";

    if (!Array.isArray(coords)) return false;

    const key = `${coords[0]}-${coords[1]}-${name}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });

  return NextResponse.json({ features });
}
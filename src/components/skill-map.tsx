import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CornerUpLeft } from "lucide-react";
import { projects, type Project } from "../data/projects";
import { ThreeCanvas } from "./three/three-canvas";
import { skillMap, type MapLayer, type SkillMapApi } from "./three/skill-map";

type Group = { group: string; items: string[] };
type Path = { group: number | null; skill: string | null; project: string | null };
const top: Path = { group: null, skill: null, project: null };

// A project uses a skill when its stack names it ("ROS 2" matches "ROS 2 Jazzy"; "C/C++" matches "C").
const uses = (skill: string, item: string) => {
  const s = skill.toLowerCase();
  const t = item.toLowerCase();
  return s === "c/c++" ? ["c", "c++", "c/c++"].includes(t) : t.startsWith(s);
};
const projectsFor = (skill: string) => projects.filter((p) => p.stack.some((i) => uses(skill, i)));

/**
 * The skill list as a map you walk into: groups on the outside, then the skills in a group, then the
 * projects that use a skill, and from a project across to the other skills it was built with.
 * The buttons beside the 3D view do the same as clicking its nodes, for keyboards and screen readers.
 */
export function SkillMap({ groups }: { groups: Group[] }) {
  const [path, setPath] = useState<Path>(top);
  const map = useRef<SkillMapApi | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const hadFocus = useRef(false);
  const setup = useMemo(() => skillMap, []);

  const group = path.group === null ? null : groups[path.group];
  const used = path.skill ? projectsFor(path.skill) : [];
  const project = projects.find((p) => p.slug === path.project);
  const alsoUses = (p: Project) =>
    groups.flatMap((g, gi) => g.items.filter((s) => s !== path.skill && p.stack.some((i) => uses(s, i))).map((s) => ({ s, gi })));

  const layers = useMemo(() => {
    const out: MapLayer[] = [
      { nodes: groups.map((g, i) => ({ id: `g:${i}`, text: g.group, count: g.items.length })), selected: path.group === null ? null : `g:${path.group}` },
    ];
    if (group) out.push({ nodes: group.items.map((s) => ({ id: `s:${s}`, text: s, count: projectsFor(s).length })), selected: path.skill && `s:${path.skill}` });
    if (path.skill) {
      out.push({
        nodes: used.length ? used.map((p) => ({ id: `p:${p.slug}`, text: p.title })) : [{ id: "", text: "No build on this site yet" }],
        selected: path.project && `p:${path.project}`,
      });
    }
    return out;
    // `used` follows from path.skill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, path]);

  const pick = (id: string) => {
    const [kind, value] = [id.slice(0, 1), id.slice(2)];
    if (kind === "g") setPath({ group: Number(value), skill: null, project: null });
    if (kind === "s") setPath((p) => ({ ...p, skill: value, project: null }));
    if (kind === "p") setPath((p) => ({ ...p, project: value }));
  };
  const up = () =>
    setPath((p) => (p.project ? { ...p, project: null } : p.skill ? { ...p, skill: null } : top));

  useEffect(() => {
    if (!map.current) return;
    map.current.onPick = pick;
    map.current.show(layers);
  }, [layers]);

  // The button that was pressed unmounts when the list changes; keep keyboard focus in the map instead of dropping it to <body>.
  useEffect(() => {
    if (!hadFocus.current) return;
    hadFocus.current = false;
    if (!root.current?.contains(document.activeElement)) panel.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [path]);
  const noteFocus = () => (hadFocus.current = !!root.current?.contains(document.activeElement));

  const crumbs = [
    { text: "Skills", to: top },
    group && { text: group.group, to: { ...path, skill: null, project: null } },
    path.skill && { text: path.skill, to: { ...path, project: null } },
    project && { text: project.title, to: path },
  ].filter(Boolean) as { text: string; to: Path }[];

  const option = "flex w-full cursor-pointer items-baseline justify-between gap-4 border-b py-2.5 text-left text-sm transition-colors duration-150 hover:text-signal";

  return (
    <div ref={root} onClickCapture={noteFocus} onKeyDownCapture={noteFocus} onKeyDown={(e) => e.key === "Escape" && up()}>
      <ThreeCanvas setup={setup} apiRef={map} className="h-[380px] border-y" />

      <nav aria-label="Where you are in the skill map" className="flex flex-wrap items-center gap-1 pt-3 font-mono text-xs">
        {crumbs.map((c, i) => (
          <span key={c.text} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            <button
              type="button"
              onClick={() => setPath(c.to)}
              aria-current={i === crumbs.length - 1 ? "location" : undefined}
              className={`min-h-6 cursor-pointer px-1 py-1 ${i === crumbs.length - 1 ? "text-signal" : "text-muted-foreground hover:text-foreground"}`}
            >
              {c.text}
            </button>
          </span>
        ))}
        {path.group !== null && (
          <button type="button" onClick={up} className="ml-auto inline-flex min-h-6 cursor-pointer items-center gap-1 px-1 py-1 text-muted-foreground hover:text-foreground">
            <CornerUpLeft className="size-3.5" aria-hidden="true" /> Back
          </button>
        )}
      </nav>

      <div ref={panel} aria-live="polite" className="mt-4 min-h-[19rem]">
        {project ? (
          <div>
            <p className="text-sm leading-relaxed text-muted-foreground">{project.summary}</p>
            {alsoUses(project).length > 0 && (
              <>
                <p className="label mt-5">Built with {path.skill} and</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {alsoUses(project).map(({ s, gi }) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => setPath({ group: gi, skill: s, project: null })}
                        className="cursor-pointer border px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-signal hover:text-signal"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link href={`/work/${project.slug}`} className="link mt-5 inline-flex items-center gap-2 text-sm font-medium">
              Read the write-up <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <p className="label">
              {path.skill ? `Where ${path.skill} went` : group ? `Skills in ${group.group}` : "Pick a group to go in"}
            </p>
            <ul className="mt-2 border-t">
              {path.skill
                ? used.length
                  ? used.map((p) => (
                      <li key={p.slug}>
                        <button type="button" className={option} onClick={() => pick(`p:${p.slug}`)}>
                          {p.title}
                          <span className="font-mono text-xs text-muted-foreground">{p.year}</span>
                        </button>
                      </li>
                    ))
                  : <li className="py-2.5 text-sm text-muted-foreground">No project on this site uses it yet.</li>
                : group
                  ? group.items.map((s) => (
                      <li key={s}>
                        <button type="button" className={option} onClick={() => pick(`s:${s}`)}>
                          {s}
                          <span className="font-mono text-xs text-muted-foreground">
                            {projectsFor(s).length ? `${projectsFor(s).length} on this site` : "–"}
                          </span>
                        </button>
                      </li>
                    ))
                  : groups.map((g, i) => (
                      <li key={g.group}>
                        <button type="button" className={option} onClick={() => pick(`g:${i}`)}>
                          {g.group}
                          <span className="font-mono text-xs text-muted-foreground">{g.items.length} skills</span>
                        </button>
                      </li>
                    ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

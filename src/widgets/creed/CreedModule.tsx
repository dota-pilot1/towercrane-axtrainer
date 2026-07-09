import { ScrollText } from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";

const CREED_INTRO = "코딩이 쉬워진 시대, 개발자는 뭘 해야 하나?";

type Commandment = { title: string; items?: string[] };

const COMMANDMENTS: Commandment[] = [
  { title: "기본에 더 충실해야 한다." },
  { title: "AI의 한계와 트레이드오프를 이해해야 한다." },
  { title: "코드 리뷰 시스템을 만들어야 한다." },
  { title: "도메인을 강화해야 한다." },
  {
    title: "커뮤니케이션과 협업 능력을 키워야 한다.",
    items: [
      "요구사항 분석",
      "이해관계자와의 소통",
      "기술적 의사결정",
      "설계 문서 공유",
      "코드 리뷰 문화",
      "AI와 사람의 역할 분담",
      "개발 생산성 개선",
    ],
  },
  { title: "작게 쪼개는 능력이 중요하다." },
  { title: "검수자/편집자 역할이 중요해진다." },
  { title: "공통 자산화를 해야 한다." },
  { title: "운영 관점을 강화해야 한다." },
  { title: "문제 정의 능력을 키워야 한다." },
];

const CREED_CONCLUSION =
  "코딩이 쉬워질수록 단순 구현만 하는 개발자는 약해진다. 반대로 아키텍처, 도메인, 상태 관리, 테스트, 운영, 코드 리뷰, 비즈니스 로직을 이해하는 개발자는 더 강해진다. AI 시대의 개발자는 코드를 많이 치는 사람이 아니라, 문제를 정의하고, 구조를 설계하고, AI가 만든 결과물을 검수하고, 도메인 로직을 제품으로 연결하는 사람이다.";

function CreedModule() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="w-[26px] h-[26px] flex items-center justify-center text-brand-primary bg-brand-glass border border-brand-border rounded-lg">
          <ScrollText size={14} />
        </span>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          AX 10계명
        </span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-surface-muted p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          {/* 인트로 */}
          <div className="flex flex-col items-center gap-2 text-center py-2">
            <span className="w-11 h-11 flex items-center justify-center text-brand-primary bg-brand-glass border border-brand-border rounded-xl">
              <ScrollText size={20} />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              AX 시대 개발자 10계명
            </h1>
            <p className="text-[13px] text-text-secondary">{CREED_INTRO}</p>
          </div>

          {/* 10계명 */}
          <ol className="flex flex-col gap-2.5">
            {COMMANDMENTS.map((c, i) => (
              <li
                key={c.title}
                className="ui-panel p-4 flex gap-3 hover:border-brand-border transition"
              >
                <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-brand-glass border border-brand-border text-brand-primary text-[13px] font-black tabular-nums">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-2 min-w-0">
                  <span className="text-[14px] font-bold text-text-primary leading-snug">
                    {c.title}
                  </span>
                  {c.items && c.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.items.map((item) => (
                        <span
                          key={item}
                          className="text-[12px] px-2 py-0.5 rounded-full border border-surface-border-soft bg-surface-muted text-text-secondary"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* 결론 */}
          <div className="ui-panel-soft p-4 flex flex-col gap-1.5 bg-brand-glass border-brand-border">
            <span className="text-[12px] font-bold text-brand-primary">결론</span>
            <p className="text-[13px] text-text-primary leading-relaxed">
              {CREED_CONCLUSION}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreedModule;

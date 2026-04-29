import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import abbaLogo from '@/assets/abba-logo.png';

type Lang = 'pt' | 'en';

const T = {
  pt: {
    // Nav
    navHow: 'Como funciona',
    navPlans: 'Planos',
    navCta: 'Começar',

    // Hero
    heroL1: 'Luz.',
    heroL2: 'Câmera.',
    heroL3: 'Ação.',
    heroSub: 'Os vídeos dos seus clientes em até 4 horas.',
    heroBtn1: 'Ver planos',
    heroBtn2: 'Como funciona →',

    // Scene 0
    s0Label: 'A real',
    s0Title1: 'Editor sobrecarregado,',
    s0Title2: 'cliente cobrando prazo.',
    s0Em: 'Resolvemos.',

    // Scene 1
    s1Label: 'Especialidade',
    s1Title: 'Feitos pra',
    s1Em: 'short video.',
    s1Desc: 'Corte, legenda, ritmo e identidade visual de cada cliente. Até 90 segundos. É só o que a gente faz. E a gente faz muito bem.',

    // Scene 2
    s2Label: 'Portfólio',
    s2Em: 'Obras.',
    s2Stat: 'vídeos entregues',

    // Scene 3
    s3Label: 'Como funciona',
    s3Title: 'Envie. Acompanhe.',
    s3Em: 'Receba.',
    s3Step1T: 'Envie',
    s3Step1D: 'Upload ou link. Brand kit de cada cliente já salvo.',
    s3Step2T: 'Acompanhe',
    s3Step2D: 'Countdown do prazo. Status ao vivo.',
    s3Step3T: 'Receba',
    s3Step3D: 'Vídeo pronto. Marque o segundo, peça ajuste.',

    // Scene 4
    s4Label: 'Na prática',
    s4Title: 'Veja o fluxo',
    s4Em: 'rodando.',
    s4Col1: 'NA FILA',
    s4Col2: 'PRODUÇÃO',
    s4Col3: 'REVISAR',
    s4Col4: 'CONCLUÍDO',
    s4Waiting: 'Aguardando',
    s4InQueue: 'Na fila',
    s4Ready: 'Pronto',
    s4Review: 'Revisar',
    s4Approve: '✓ Aprovar',

    // Scene 5
    s5L1: 'Todos os clientes.',
    s5L2: 'Toda a edição.',
    s5Em: 'Um preço fixo por mês.',

    // Scene 6
    s6Label: 'Planos',
    s6Title: 'A partir de',
    s6Price: 'R$490',
    s6Em: 'por mês.',
    s6Sub: 'Escolha o prazo no WhatsApp. A gente monta com você.',
    s6PerMonth: 'por mês',
    s6Cancel: 'Cancele quando quiser. Sem multa.',
    s6F1: '✓ Reels, Shorts e TikTok até 90s',
    s6F2: '✓ Sem cota mensal',
    s6F3: '✓ Identidade visual de cada cliente',
    s6F4: '✓ Brand kits ilimitados',
    s6Btn: 'Falar no WhatsApp',

    // Scene 7
    s7Title: 'Dúvidas.',

    // Scene 8
    s8L1: 'Seu próximo vídeo',
    s8L2: 'poderia estar em',
    s8L3: 'produção',
    s8Em: 'agora.',
    s8Btn: 'Começar agora',
    s8Sub: 'A partir de R$490/mês.',

    // Footer
    footerTerms: 'Termos',
    footerPrivacy: 'Privacidade',

    // Tiers
    tiers: [
      { sla: 'Entrega em 72h úteis', price: 'R$490', tier: 'Standard', btn: 'Começar com Standard' },
      { sla: 'Entrega em 48h úteis', price: 'R$660', tier: 'Pro', btn: 'Começar com Pro' },
      { sla: 'Entrega em 24h úteis', price: 'R$1.100', tier: 'Business', btn: 'Começar com Business' },
      { sla: 'Entrega em 8h úteis', price: 'R$2.970', tier: 'Premium', btn: 'Começar com Premium' },
      { sla: 'Entrega em 4h úteis', price: 'R$5.590', tier: 'Agency', btn: 'Começar com Agency' },
    ],

    // FAQ
    faq: [
      { q: 'Fila ilimitada?', a: 'Peça sem limite, de quantos clientes quiser. Entregamos na ordem, dentro do prazo. Um sai, outro entra.' },
      { q: 'Como funciona o prazo?', a: 'Horas úteis a partir do envio. Countdown no dashboard.' },
      { q: 'O que inclui?', a: 'Corte, legenda, ritmo, identidade visual de cada cliente. Até 90s.' },
      { q: 'Não gostei.', a: 'Marca o segundo, descreve o ajuste. Sem limite. Sem custo extra.' },
      { q: 'Cancelar?', a: 'Quando quiser. Sem multa.' },
    ],

    // Portfolio
    portfolio: [
      { name: 'Dra. Amanda Souto', type: 'Estética', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc86397e5b8d65048fdf7b.mp4' },
      { name: 'Dr. Rodrigo Pongeluppi', type: 'Neurocirurgião', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc8639a37cc2a95f116653.mp4' },
      { name: 'Bárbara Marques', type: 'Contadora', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc86392f5f65459954d311.mp4' },
      { name: 'Iron Horse', type: 'Suplementos', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc8639d8f04789a65d218f.mp4' },
      { name: 'Doutor Hérnia', type: 'Fisioterapia', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc863907f24f9d465b5093.mp4' },
    ],
  },
  en: {
    // Nav
    navHow: 'How it works',
    navPlans: 'Pricing',
    navCta: 'Get started',

    // Hero
    heroL1: 'Lights.',
    heroL2: 'Camera.',
    heroL3: 'Action.',
    heroSub: 'Your video edited in up to 4 hours.',
    heroBtn1: 'See plans',
    heroBtn2: 'How it works →',

    // Scene 0
    s0Label: 'The truth',
    s0Title1: 'Good editing was expensive',
    s0Title2: 'and slow.',
    s0Em: 'We fixed it.',

    // Scene 1
    s1Label: 'Expertise',
    s1Title: 'Built for',
    s1Em: 'short video.',
    s1Desc: 'Cut, subtitles, pacing and brand identity. Up to 90 seconds. It\'s all we do. And we do it really well.',

    // Scene 2
    s2Label: 'Portfolio',
    s2Em: 'Work.',
    s2Stat: 'videos delivered',

    // Scene 3
    s3Label: 'How it works',
    s3Title: 'Send. Track.',
    s3Em: 'Receive.',
    s3Step1T: 'Send',
    s3Step1D: 'Upload or link. Brief already saved.',
    s3Step2T: 'Track',
    s3Step2D: 'SLA countdown. Live status.',
    s3Step3T: 'Receive',
    s3Step3D: 'Video ready. Mark the second, request changes.',

    // Scene 4
    s4Label: 'In practice',
    s4Title: 'See the flow',
    s4Em: 'running.',
    s4Col1: 'QUEUE',
    s4Col2: 'PRODUCTION',
    s4Col3: 'REVIEW',
    s4Col4: 'DONE',
    s4Waiting: 'Waiting',
    s4InQueue: 'In queue',
    s4Ready: 'Ready',
    s4Review: 'Review',
    s4Approve: '✓ Approve',

    // Scene 5
    s5L1: 'Send everything.',
    s5L2: 'We edit everything.',
    s5Em: 'One flat price per month.',

    // Scene 6
    s6Label: 'Pricing',
    s6Title: 'From',
    s6Price: 'R$490',
    s6Em: 'per month.',
    s6Sub: 'Pick your turnaround on WhatsApp. We build it with you.',
    s6PerMonth: 'per month',
    s6Cancel: 'Cancel anytime. No penalty.',
    s6F1: '✓ Reels, Shorts & TikTok up to 90s',
    s6F2: '✓ No monthly cap',
    s6F3: '✓ Brand identity for each client',
    s6F4: '✓ Unlimited brand kits',
    s6Btn: 'Talk on WhatsApp',

    // Scene 7
    s7Title: 'Questions.',

    // Scene 8
    s8L1: 'Your next video',
    s8L2: 'could be in',
    s8L3: 'production',
    s8Em: 'now.',
    s8Btn: 'Get started',
    s8Sub: 'Starting at R$490/mo.',

    // Footer
    footerTerms: 'Terms',
    footerPrivacy: 'Privacy',

    // Tiers
    tiers: [
      { sla: 'Delivery in 72 biz hours', price: 'R$490', tier: 'Standard', btn: 'Start with Standard' },
      { sla: 'Delivery in 48 biz hours', price: 'R$660', tier: 'Pro', btn: 'Start with Pro' },
      { sla: 'Delivery in 24 biz hours', price: 'R$1.100', tier: 'Business', btn: 'Start with Business' },
      { sla: 'Delivery in 8 biz hours', price: 'R$2.970', tier: 'Premium', btn: 'Start with Premium' },
      { sla: 'Delivery in 4 biz hours', price: 'R$5.590', tier: 'Agency', btn: 'Start with Agency' },
    ],

    // FAQ
    faq: [
      { q: 'Unlimited queue?', a: 'Request without limits. We deliver in order, within your contracted turnaround. One goes out, another comes in.' },
      { q: 'How does the turnaround work?', a: 'Business hours from submission. Countdown on the dashboard.' },
      { q: 'What\'s included?', a: 'Cut, subtitles, pacing, brand identity. Up to 90s.' },
      { q: 'I didn\'t like it.', a: 'Mark the second, describe the change. No limit. No extra cost.' },
      { q: 'Cancel?', a: 'Anytime. No penalty.' },
    ],

    // Portfolio
    portfolio: [
      { name: 'Dra. Amanda Souto', type: 'Aesthetics', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc86397e5b8d65048fdf7b.mp4' },
      { name: 'Dr. Rodrigo Pongeluppi', type: 'Neurosurgeon', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc8639a37cc2a95f116653.mp4' },
      { name: 'Bárbara Marques', type: 'Accountant', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc86392f5f65459954d311.mp4' },
      { name: 'Iron Horse', type: 'Supplements', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc8639d8f04789a65d218f.mp4' },
      { name: 'Doutor Hérnia', type: 'Physiotherapy', video: 'https://assets.cdn.filesafe.space/iiiSVxqjDsjJESXX2UqE/media/69bc863907f24f9d465b5093.mp4' },
    ],
  },
};

const BLOBS = [
  { w: '35vw', b: '-18vw', l: '-5%', c: 'green', r: 1.0 },
  { w: '28vw', b: '-14vw', l: '12%', c: 'blue', r: 1.3 },
  { w: '40vw', b: '-20vw', l: '25%', c: 'purple', r: 0.85 },
  { w: '30vw', b: '-15vw', l: '40%', c: 'magenta', r: 1.15 },
  { w: '45vw', b: '-22vw', l: '50%', c: 'pink', r: 0.95 },
  { w: '32vw', b: '-16vw', l: '65%', c: 'coral', r: 1.25 },
  { w: '38vw', b: '-19vw', l: '78%', c: 'orange', r: 1.05 },
  { w: '34vw', b: '-17vw', l: '92%', c: 'yellow', r: 0.9 },
];
const TOTAL_SCENES = 9; // statement, expertise, portfolio, howItWorks, demo, valueProps, pricing, faq, cta

export default function Landing() {
  const [sp, setSp] = useState(0);
  const [slider, setSlider] = useState(0);
  const [faq, setFaq] = useState<number | null>(null);
  const [lang, setLang] = useState<Lang>('pt');
  const [videoModal, setVideoModal] = useState<{ name: string; type: string; video: string } | null>(null);
  const touchTargetRef = useRef<{ value: number }>({ value: 0 });

  const t = T[lang];
  const tier = t.tiers[slider];

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('ref');
    if (r?.trim()) localStorage.setItem('affiliate_ref', r.trim().toLowerCase());
  }, []);

  // Unified scroll: native scroll on desktop, touch-hijack on mobile
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let current = 0;
    let touchStartY = 0;
    let raf = 0;
    const sensitivity = 0.0012;
    const lerp = 0.12;

    // target lives in the ref so scrollToScene can set it from outside
    touchTargetRef.current.value = 0;

    const update = () => {
      const target = touchTargetRef.current.value;
      current += (target - current) * lerp;
      if (Math.abs(current - target) < 0.0001) current = target;
      setSp(current);
      raf = requestAnimationFrame(update);
    };

    if (isTouchDevice) {
      let isScrolling = false;
      let touchAccum = 0;
      const snapThreshold = 30;

      const onTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY;
        isScrolling = false;
        touchAccum = 0;
      };

      const onTouchMove = (e: TouchEvent) => {
        const t = e.target as HTMLElement;
        // Allow native scroll on these elements
        if (t.closest('.prow') || t.closest('.slw') || t.closest('input') || t.closest('.vm-backdrop')) return;

        const dy = touchStartY - e.touches[0].clientY;
        touchStartY = e.touches[0].clientY;
        touchAccum += dy;

        // Only hijack scroll after 5px of movement (avoid blocking taps)
        if (Math.abs(touchAccum) > 5) {
          isScrolling = true;
          e.preventDefault();
        }
      };

      const onTouchEnd = () => {
        if (Math.abs(touchAccum) > snapThreshold) {
          const heroPhase = 0.2;
          const sceneSize = 0.8 / 9;
          const direction = touchAccum > 0 ? 1 : -1;
          let next = 0;

          if (current < heroPhase && direction > 0) {
            next = heroPhase + sceneSize * 0.5;
          } else if (current >= heroPhase) {
            const curScene = Math.floor((current - heroPhase) / sceneSize);
            const nextScene = Math.max(0, Math.min(8, curScene + direction));
            next = heroPhase + nextScene * sceneSize + sceneSize * 0.5;
          }
          touchTargetRef.current.value = Math.max(0, Math.min(1, next));
        }
        touchAccum = 0;
      };

      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd, { passive: true });
      raf = requestAnimationFrame(update);

      return () => {
        document.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        cancelAnimationFrame(raf);
      };
    } else {
      // Desktop: use native scroll
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setSp(max > 0 ? window.scrollY / max : 0);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }
  }, []);

  // Scroll to scene by index — works on both desktop and mobile
  const scrollToScene = useCallback((sceneIndex: number) => {
    const heroPhase = 0.2;
    const scenePhase = 0.8;
    const targetProgress = heroPhase + (sceneIndex / TOTAL_SCENES) * scenePhase + 0.01;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      touchTargetRef.current.value = targetProgress;
    } else {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: targetProgress * totalHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      const map: Record<string, number> = { '#howit': 3, '#plans': 6 };
      if (map[href] !== undefined) scrollToScene(map[href]);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [scrollToScene]);

  // Hero phase: first 20% of scroll
  const heroP = Math.min(1, sp / 0.2);
  // Scene phase: remaining 80%
  const sceneP = Math.max(0, (sp - 0.2) / 0.8);
  const scene = Math.min(TOTAL_SCENES - 1, Math.floor(sceneP * TOTAL_SCENES));

  const gooOpacity = heroP < 0.55 ? 1 : Math.max(0, 1 - (heroP - 0.55) / 0.2);
  const heroOpacity = Math.max(0, 1 - heroP * 2.5);
  const showGoo = heroP < 0.8;

  const sc = (i: number) => `sc${i === scene ? ' on' : i < scene ? ' up' : ' dn'}`;

  // ═══ RENDER ═══
  return (
    <>
      <style>{CSS}</style>
      <div className="lp">
        <nav className={`nv ${heroP < 0.5 ? 'light' : 'dark'}`}>
          <a href="#" className="nv-l"><img src={abbaLogo} alt="" className="nv-logo" />AbbaVideo</a>
          <div className="nv-r">
            <a href="#howit">{t.navHow}</a>
            <a href="#plans">{t.navPlans}</a>
            <button
              onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
              className="lang-btn"
            >
              {lang === 'pt' ? 'EN' : 'PT'}
            </button>
            <a href="#plans" className="nv-c">{t.navCta}</a>
          </div>
        </nav>

        {/* L1: Dark scenes */}
        <div className="dark-layer">
          {heroP >= 0.9 && <div className="dots">{Array.from({ length: TOTAL_SCENES }).map((_, i) => <div key={i} className={`dot${i === scene ? ' on' : ''}`} />)}</div>}
          <div className="stage">
            <div className={sc(0)}><div><p className="lb">{t.s0Label}</p><h2 className="hl hm">{t.s0Title1}<br/>{t.s0Title2} <em>{t.s0Em}</em></h2></div></div>

            {/* Scene 1: Expertise — orbit */}
            <div className={sc(1)}><div style={{ width: '100%', maxWidth: 600, textAlign: 'center' }}>
              <p className="lb">{t.s1Label}</p>
              <h2 className="hl hm" style={{ marginBottom: 40 }}>{t.s1Title} <em>{t.s1Em}</em></h2>
              <div className="orbit">
                <div className="orbit-center">{'\u25B6\uFE0E'}</div>
                <div className="orbit-spin orbit-r1">
                  {['\u2702\uFE0E','\u266B\uFE0E','Aa'].map((icon, i) => {
                    const angle = (i / 3) * 360;
                    return <div key={i} className="oi-wrap" style={{ transform: `rotate(${angle}deg) translateX(var(--r1))` }}><div className="oi"><span style={{ transform: `rotate(-${angle}deg)` }} className="oi-icon oi-i1">{icon}</span></div></div>;
                  })}
                </div>
                <div className="orbit-spin orbit-r2">
                  {['\u25B6\uFE0E','\u25CE\uFE0E','\u229E\uFE0E'].map((icon, i) => {
                    const angle = (i / 3) * 360;
                    return <div key={i} className="oi-wrap" style={{ transform: `rotate(${angle}deg) translateX(var(--r2))` }}><div className="oi"><span style={{ transform: `rotate(-${angle}deg)` }} className="oi-icon oi-i2">{icon}</span></div></div>;
                  })}
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--tw3)', marginTop: 32, maxWidth: 360, margin: '32px auto 0' }}>{t.s1Desc}</p>
            </div></div>

            <div className={sc(2)}><div style={{ width: '100%', maxWidth: 820 }}>
              <p className="lb">{t.s2Label}</p><h2 className="hl hm" style={{ marginBottom: 32 }}><em>{t.s2Em}</em></h2>
              <div className="prow">
                {t.portfolio.map((p, i) => (
                  <div key={p.name} className={`pc pc-anim${i}`} onClick={() => setVideoModal(p)}>
                    <video className="pc-vid" src={p.video + '#t=1'} muted playsInline preload="metadata" />
                    <div className="pc-ov">
                      <div className="pc-play">{'\u25B6\uFE0E'}</div>
                      <div className="pc-meta">
                        <div className="pc-name">{p.name}</div>
                        <div className="pc-type">{p.type}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div></div>

            <div className={sc(3)} id="howit"><div>
              <p className="lb">{t.s3Label}</p><h2 className="hl hm">{t.s3Title} <em>{t.s3Em}</em></h2>
              <div className="fts">
                <div className="ft"><div className="ft-t">{t.s3Step1T}</div><div className="ft-d">{t.s3Step1D}</div></div>
                <div className="ft"><div className="ft-t">{t.s3Step2T}</div><div className="ft-d">{t.s3Step2D}</div></div>
                <div className="ft"><div className="ft-t">{t.s3Step3T}</div><div className="ft-d">{t.s3Step3D}</div></div>
              </div>
            </div></div>

            {/* Scene 4: Demo — Real dashboard mockup */}
            <div className={sc(4)}><div style={{ width: '100%', maxWidth: 820 }}>
              <p className="lb">{t.s4Label}</p>
              <h2 className="hl hm" style={{ marginBottom: 28 }}>{t.s4Title} <em>{t.s4Em}</em></h2>
              <div className="dash">
                {/* Kanban columns */}
                <div className="dash-col">
                  <div className="dash-hd"><span>{t.s4Col1}</span><span className="dash-cnt">2</span></div>
                  <div className="d-card d-anim1">
                    <div className="d-top"><span className="d-type">Reel</span><span className="d-editor">{t.s4Waiting}</span></div>
                    <div className="d-title">Rotina de manhã</div>
                    <div className="d-sla d-sla-g">{t.s4InQueue}</div>
                  </div>
                  <div className="d-card d-anim2">
                    <div className="d-top"><span className="d-type">Short</span></div>
                    <div className="d-title">Review produto</div>
                    <div className="d-sla d-sla-g">{t.s4InQueue}</div>
                  </div>
                </div>
                <div className="dash-col">
                  <div className="dash-hd"><span>{t.s4Col2}</span><span className="dash-cnt">1</span></div>
                  <div className="d-card d-anim3">
                    <div className="d-top"><span className="d-type">TikTok</span><span className="d-editor">Carlos E.</span></div>
                    <div className="d-title">Trend challenge</div>
                    <div className="d-sla d-sla-y">3h 42min</div>
                    <div className="d-bar"><div className="d-fill d-fill-anim" style={{ width: '62%' }} /></div>
                  </div>
                </div>
                <div className="dash-col">
                  <div className="dash-hd"><span>{t.s4Col3}</span><span className="dash-cnt">1</span></div>
                  <div className="d-card d-anim4">
                    <div className="d-top"><span className="d-type">Reel</span><span className="d-editor">Carlos E.</span></div>
                    <div className="d-title">Dica rápida #12</div>
                    <div className="d-sla d-sla-ok">{t.s4Ready}</div>
                    <div className="d-actions">
                      <span className="d-btn-rev">{t.s4Review}</span>
                      <span className="d-btn-ok">{t.s4Approve}</span>
                    </div>
                  </div>
                </div>
                <div className="dash-col">
                  <div className="dash-hd"><span>{t.s4Col4}</span><span className="dash-cnt">1</span></div>
                  <div className="d-card d-anim5">
                    <div className="d-top"><span className="d-type">Short</span><span className="d-editor">Carlos E.</span></div>
                    <div className="d-title">Unboxing setup</div>
                    <div className="d-sla d-sla-done">2h 14min ✓</div>
                  </div>
                </div>
              </div>
            </div></div>

            <div className={sc(5)}><div><h2 className="hl hm">{t.s5L1}<br/>{t.s5L2}<br/><em>{t.s5Em}</em></h2></div></div>

            <div className={sc(6)} id="plans"><div className="pw">
              <p className="lb" style={{ textAlign: 'center' }}>{t.s6Label}</p>
              <div className="p6-card">
                <div className="p6-price-wrap">
                  <span className="p6-from">{t.s6Title}</span>
                  <span className="p6-price">{t.s6Price}</span>
                  <span className="p6-per"><em>{t.s6Em}</em></span>
                </div>
                <p className="p6-sub">{t.s6Sub}</p>

                <div className="p6-feats">
                  <div className="p6-feat"><span className="p6-chk">✓</span><span>{t.s6F1.replace('✓ ', '')}</span></div>
                  <div className="p6-feat"><span className="p6-chk">✓</span><span>{t.s6F2.replace('✓ ', '')}</span></div>
                  <div className="p6-feat"><span className="p6-chk">✓</span><span>{t.s6F3.replace('✓ ', '')}</span></div>
                  <div className="p6-feat"><span className="p6-chk">✓</span><span>{t.s6F4.replace('✓ ', '')}</span></div>
                </div>

                <a
                  href="https://wa.me/5511999999999?text=Olá! Quero conhecer os planos da AbbaVideo."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p6-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413"/>
                  </svg>
                  {t.s6Btn}
                </a>

                <p className="p6-note">{t.s6Cancel}</p>
              </div>
            </div></div>

            <div className={sc(7)}><div className="fw">
              <h2 className="faq-t">{t.s7Title}</h2>
              {t.faq.map((item, i) => <div key={i} className="fi">
                <button className={`fiq${faq === i ? ' open' : ''}`} onClick={() => setFaq(faq === i ? null : i)}>{item.q}</button>
                <div className={`fia${faq === i ? ' open' : ''}`}><p>{item.a}</p></div>
              </div>)}
            </div></div>

            <div className={sc(8)}><div style={{ textAlign: 'center' }}>
              <h2 className="hl hm">{t.s8L1}<br/>{t.s8L2}<br/>{t.s8L3} <em>{t.s8Em}</em></h2>
              <div style={{ marginTop: 30 }}><a href="#plans" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 100, background: '#F5F5F7', color: '#0A0A0A', fontSize: 14, fontWeight: 600 }}>{t.s8Btn}</a></div>
              <p style={{ marginTop: 16, fontSize: 13, color: 'var(--tw3)' }}>{t.s8Sub}</p>
            </div></div>
          </div>
        </div>

        {/* L2: Goo blobs */}
        {showGoo && (
          <div className="goo" style={{ opacity: gooOpacity }}>
            {BLOBS.map((b, i) => {
              const localP = Math.max(0, heroP - i * 0.04);
              const scale = Math.min(localP * b.r * 2.5, 3.5);
              return <div key={i} className={`blob ${b.c}`} style={{ width: b.w, height: b.w, bottom: b.b, left: b.l, transform: `scale(${scale})` }} />;
            })}
          </div>
        )}

        {/* L3: Hero text */}
        {heroOpacity > 0 && (
          <div className="hero-text" style={{ opacity: heroOpacity }}>
            <h1 className="hl hl-hero">{t.heroL1}<br />{t.heroL2}<br /><em>{t.heroL3}</em></h1>
            <p className="sb">{t.heroSub}</p>
            <div className="br">
              <a href="#plans" className="bd">{t.heroBtn1}</a>
              <a href="#howit" className="bg-btn">{t.heroBtn2}</a>
            </div>
            <div className="scroll-line">
              <div className="scroll-line-fill" />
            </div>
          </div>
        )}

        {/* Video Modal */}
        {videoModal && (
          <div className="vm-backdrop" onClick={() => setVideoModal(null)}>
            <div className="vm-container" onClick={e => e.stopPropagation()}>
              <button className="vm-close" onClick={() => setVideoModal(null)}>&times;</button>
              <video className="vm-video" src={videoModal.video} controls autoPlay playsInline />
              <div className="vm-info">
                <span className="vm-name">{videoModal.name}</span>
                <span className="vm-type">{videoModal.type}</span>
              </div>
            </div>
          </div>
        )}

        <div className="scroll-driver" />
        <footer className="fo">
          <span>© 2026 AbbaVideo</span>
          <div className="fl">
            <a href="https://instagram.com/abbamarketing" target="_blank" rel="noopener noreferrer">Instagram</a>
            <Link to="/terms">{t.footerTerms}</Link>
            <Link to="/privacy">{t.footerPrivacy}</Link>
          </div>
        </footer>
      </div>
    </>
  );
}

const CSS = `
:root{--bg:#FBFBFA;--tx:#1D1D1F;--tx2:#86868B;--tx3:#AEAEB2;--tw:#F5F5F7;--tw2:rgba(255,255,255,.5);--tw3:rgba(255,255,255,.22);--gr:linear-gradient(90deg,#D0D0D0,#B8B8B8,#A0A0A0,#B8B8B8,#D0D0D0);--fd:'Clash Display',sans-serif;--fb:'Satoshi',sans-serif}
.lp{font-family:var(--fb);font-size:16px;-webkit-font-smoothing:antialiased;overflow-x:hidden;background:#050505;-webkit-overflow-scrolling:touch;overscroll-behavior:none}
.lp a{color:inherit;text-decoration:none}
.nv{position:fixed;top:0;left:0;width:100%;z-index:100;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;transition:background .4s}
.nv.dark{background:rgba(5,5,5,.8);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
@media(min-width:768px){.nv{padding:16px 48px}}
.nv-l{font-family:var(--fd);font-weight:600;font-size:17px;letter-spacing:-.02em;transition:color .4s;display:flex;align-items:center;gap:8px}
.nv-logo{width:24px;height:24px;transition:filter .4s}
.nv.light .nv-logo{filter:brightness(0)}
.nv.dark .nv-logo{filter:brightness(100)}
.nv-r{display:flex;align-items:center;gap:28px}
.nv-r a{font-size:12px;transition:color .2s}
.nv-c{padding:7px 18px;border-radius:100px;font-size:12px;font-weight:600;transition:background .4s,color .4s}
/* Light mode nav (hero visible) */
.nv.light .nv-l{color:var(--tx)}
.nv.light .nv-r a{color:var(--tx3)}
.nv.light .nv-r a:hover{color:var(--tx)}
.nv.light .nv-c{background:var(--tx);color:var(--bg);border:none}
/* Dark mode nav */
.nv.dark .nv-l{color:#fff}
.nv.dark .nv-r a{color:rgba(255,255,255,.7)}
.nv.dark .nv-r a:hover{color:#fff}
.nv.dark .nv-c{background:transparent;color:#F5F5F7;border:1px solid rgba(255,255,255,.35)}
.nv.dark .nv-c:hover{border-color:rgba(255,255,255,.5)}
.lang-btn{font-size:11px;font-weight:700;cursor:pointer;border-radius:4px;padding:3px 8px;letter-spacing:.03em;transition:opacity .2s}
.lang-btn:hover{opacity:.7}
.nv.light .lang-btn{background:rgba(0,0,0,.06);border:1px solid rgba(0,0,0,.18);color:#1D1D1F}
.nv.dark .lang-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);color:#F5F5F7}
@media(max-width:600px){.nv-r a:not(.nv-c):not(.lang-btn){display:none}}

.scroll-driver{height:900vh;height:900dvh}

/* L1 */
.dark-layer{position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;z-index:1}
.stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:visible}

/* L2 */
.goo{position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;z-index:2;pointer-events:none;overflow:hidden;filter:blur(30px) contrast(8);background:#FBFBFA;transition:opacity .3s}
.blob{position:absolute;border-radius:50%;background:#050505;will-change:transform}
.blob.green{box-shadow:0 0 15px 8px #00DC82,0 0 40px 16px rgba(0,220,130,.4)}
.blob.blue{box-shadow:0 0 15px 8px #32B4FF,0 0 40px 16px rgba(50,180,255,.4)}
.blob.purple{box-shadow:0 0 15px 8px #9C6ADE,0 0 40px 16px rgba(156,106,222,.4)}
.blob.magenta{box-shadow:0 0 15px 8px #E040FB,0 0 40px 16px rgba(224,64,251,.4)}
.blob.pink{box-shadow:0 0 15px 8px #FF69B4,0 0 40px 16px rgba(255,105,180,.4)}
.blob.coral{box-shadow:0 0 15px 8px #FF7B6B,0 0 40px 16px rgba(255,123,107,.4)}
.blob.orange{box-shadow:0 0 15px 8px #FF8C42,0 0 40px 16px rgba(255,140,66,.4)}
.blob.yellow{box-shadow:0 0 15px 8px #FFD43B,0 0 40px 16px rgba(255,212,59,.4)}

/* L3 */
.hero-text{position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none;padding:20px}
/* Scroll indicator line with gradient */
.scroll-line{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:2px;height:48px;border-radius:2px;background:rgba(0,0,0,.06);overflow:hidden}
.scroll-line-fill{width:100%;height:60%;border-radius:2px;background:linear-gradient(180deg,#00DC82,#32B4FF,#9C6ADE,#E040FB,#FF7B6B,#FF8C42,#FFD43B);animation:scrollFill 2s ease-in-out infinite}
@keyframes scrollFill{0%{transform:translateY(-100%)}50%{transform:translateY(100%)}100%{transform:translateY(-100%)}}
.hero-text a{pointer-events:auto}
.hero-text .hl{color:var(--tx) !important}
.hero-text .sb{color:var(--tx2) !important}
.hero-text .bd{background:var(--tx) !important;color:var(--bg) !important}
.hero-text .bg-btn{color:var(--tx) !important}

.hl{font-family:var(--fd);font-weight:600;font-size:clamp(36px,6.5vw,72px);line-height:.92;letter-spacing:-.045em}
.hl em{font-style:normal;background:var(--gr);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hm{font-size:clamp(26px,4.5vw,50px)}
.sb{font-size:clamp(14px,1.5vw,17px);color:var(--tx2);line-height:1.5;max-width:380px;margin:20px auto 0}
.br{margin-top:30px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
/* Buttons — dark on light (hero) */
.bd{padding:11px 26px;border-radius:100px;font-size:14px;font-weight:600;background:var(--tx);color:var(--bg);transition:opacity .2s}
.bd:hover{opacity:.8}
.bg-btn{padding:11px 20px;font-size:13px;font-weight:600;color:var(--tx);border:1px solid rgba(0,0,0,.15);border-radius:100px;transition:border-color .2s}
.bg-btn:hover{border-color:rgba(0,0,0,.4)}
/* Buttons — light on dark (scenes) */
.sc .bd{background:#F5F5F7;color:#0A0A0A}
.sc .bg-btn{color:var(--tw);border-color:rgba(255,255,255,.15)}
.sc .bg-btn:hover{border-color:rgba(255,255,255,.4)}
.lb{font-size:11px;font-weight:600;color:var(--tw3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px}

.sc{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;opacity:0;transform:translateY(24px);pointer-events:none;transition:opacity .5s cubic-bezier(.23,1,.32,1),transform .6s cubic-bezier(.23,1,.32,1)}
.sc.on{opacity:1;transform:none;pointer-events:auto}
.sc.up{opacity:0;transform:translateY(-24px)}
.sc.dn{opacity:0;transform:translateY(24px)}
.sc .hl{color:var(--tw)}

.sc .hl,.sc .lb,.sc .fts,.sc .pl,.sc .pr,.sc .fw,.sc .prow{transition:opacity .6s cubic-bezier(.23,1,.32,1),transform .7s cubic-bezier(.23,1,.32,1)}
.sc.on .hl{opacity:1;transform:none;transition-delay:0s}
.sc.on .lb{opacity:1;transform:none;transition-delay:0s}
.sc.on .fts{opacity:1;transform:none;transition-delay:.12s}
.sc.on .pl{opacity:1;transform:none;transition-delay:.05s}
.sc.on .pr{opacity:1;transform:none;transition-delay:.18s}
.sc.on .fw{opacity:1;transform:none;transition-delay:.05s}
.sc.on .prow{opacity:1;transform:none;transition-delay:.1s}
.sc:not(.on) .hl{opacity:0;transform:translateY(20px)}
.sc:not(.on) .lb{opacity:0;transform:translateY(10px)}
.sc:not(.on) .fts{opacity:0;transform:translateY(20px)}
.sc:not(.on) .pl{opacity:0;transform:translateX(-30px)}
.sc:not(.on) .pr{opacity:0;transform:translateX(30px)}
.sc:not(.on) .fw{opacity:0;transform:translateY(20px)}
.sc:not(.on) .prow{opacity:0;transform:translateX(30px)}

.fts{display:grid;gap:10px;grid-template-columns:1fr;width:100%;max-width:600px;margin:36px auto 0;text-align:left}
@media(min-width:600px){.fts{grid-template-columns:1fr 1fr 1fr}}
.ft{padding:22px 18px;border-radius:14px;background:rgba(255,255,255,.04);transition:opacity .5s,transform .6s cubic-bezier(.23,1,.32,1)}
.sc.on .ft{opacity:1;transform:none}
.sc.on .ft:nth-child(1){transition-delay:.14s}
.sc.on .ft:nth-child(2){transition-delay:.22s}
.sc.on .ft:nth-child(3){transition-delay:.3s}
.sc:not(.on) .ft{opacity:0;transform:translateY(15px)}
.ft-t{font-family:var(--fd);font-weight:600;font-size:15px;margin-bottom:4px;color:var(--tw)}
.ft-d{font-size:12px;color:var(--tw2);line-height:1.4}

.pw{max-width:720px;width:100%}
.pg{display:grid;gap:40px;grid-template-columns:1fr;text-align:left;margin-top:30px}
@media(min-width:768px){.pg{grid-template-columns:1fr 1fr;align-items:center}}
.slr{display:flex;justify-content:space-between;margin-bottom:6px;font-size:10px;color:var(--tw3);font-weight:500}
.slw{position:relative;height:36px;display:flex;align-items:center}
.slw input{-webkit-appearance:none;appearance:none;width:100%;height:2px;background:rgba(255,255,255,.1);border-radius:10px;outline:none;z-index:2;position:relative;cursor:pointer}
.slw input::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:#F5F5F7;cursor:grab;box-shadow:0 1px 6px rgba(0,0,0,.3);touch-action:pan-x}
.slw input::-moz-range-thumb{width:24px;height:24px;border:none;border-radius:50%;background:#F5F5F7;cursor:grab}
.slw input{touch-action:pan-x}
.slf{position:absolute;top:50%;left:0;height:2px;transform:translateY(-50%);background:#F5F5F7;border-radius:10px;pointer-events:none;z-index:1}
.psla{font-size:11px;color:var(--tw3);margin-top:16px;text-transform:uppercase;letter-spacing:.06em;font-weight:500}
.pval{font-family:var(--fd);font-weight:600;font-size:clamp(36px,5vw,56px);line-height:1;letter-spacing:-.04em;margin:6px 0}
.pval span{background:var(--gr);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.pper{font-size:13px;color:var(--tw2)}
.ptier{display:inline-block;margin-top:12px;padding:3px 12px;border-radius:100px;background:rgba(255,255,255,.06);font-size:10px;font-weight:600;color:var(--tw2)}
.pf{font-size:13px;color:var(--tw2);margin-bottom:8px}
.pb{display:block;margin-top:16px;padding:12px;border-radius:10px;background:#F5F5F7 !important;color:#0A0A0A !important;font-size:13px;font-weight:600;text-align:center;transition:opacity .2s}
.pb:hover{opacity:.85}
.pn{margin-top:8px;font-size:11px;color:var(--tw3)}

/* Scene 6 — Plans card (redesigned) */
.p6-card{
  position:relative;
  max-width:560px;width:100%;margin:28px auto 0;
  padding:48px 36px 36px;
  border-radius:28px;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,.06) 0%, rgba(255,255,255,0) 60%),
    linear-gradient(180deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.015) 100%);
  border:1px solid rgba(255,255,255,.08);
  box-shadow:
    0 1px 0 rgba(255,255,255,.04) inset,
    0 30px 60px -20px rgba(0,0,0,.5),
    0 8px 24px -8px rgba(0,0,0,.3);
  backdrop-filter:blur(8px);
  text-align:center;
  transition:opacity .6s cubic-bezier(.23,1,.32,1),transform .7s cubic-bezier(.23,1,.32,1);
}
.sc.on .p6-card{opacity:1;transform:none;transition-delay:.05s}
.sc:not(.on) .p6-card{opacity:0;transform:translateY(20px)}
.p6-card::before{
  content:'';position:absolute;inset:0;border-radius:28px;padding:1px;
  background:linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,.08));
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  pointer-events:none;
}
.p6-price-wrap{display:flex;flex-direction:column;align-items:center;gap:6px}
.p6-from{font-size:13px;color:var(--tw3);text-transform:uppercase;letter-spacing:.08em;font-weight:500}
.p6-price{
  font-family:var(--fd);font-weight:600;
  font-size:clamp(64px,9vw,96px);line-height:1;letter-spacing:-.05em;
  background:var(--gr);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.p6-per{font-family:var(--fd);font-size:clamp(20px,2.4vw,26px);color:var(--tw);letter-spacing:-.02em}
.p6-per em{font-style:italic;color:var(--tw2);font-weight:400}
.p6-sub{margin-top:18px;font-size:15px;color:var(--tw2);line-height:1.5;max-width:380px;margin-left:auto;margin-right:auto}

.p6-feats{
  display:grid;grid-template-columns:1fr;gap:10px;
  margin:32px auto 0;max-width:380px;text-align:left;
}
@media(min-width:520px){.p6-feats{grid-template-columns:1fr 1fr;max-width:460px}}
.p6-feat{
  display:flex;align-items:center;gap:10px;
  padding:12px 14px;border-radius:12px;
  background:rgba(255,255,255,.035);
  border:1px solid rgba(255,255,255,.05);
  font-size:13px;color:var(--tw);line-height:1.3;
}
.p6-chk{
  flex-shrink:0;width:20px;height:20px;border-radius:50%;
  display:inline-flex;align-items:center;justify-content:center;
  background:var(--gr);color:#0A0A0A;font-size:11px;font-weight:700;
}

.p6-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  margin-top:32px;padding:16px 32px;border-radius:100px;
  background:#25D366;color:#0A0A0A !important;
  font-family:var(--fd);font-size:15px;font-weight:600;letter-spacing:-.01em;
  box-shadow:0 8px 24px -6px rgba(37,211,102,.5),0 0 0 1px rgba(255,255,255,.08) inset;
  transition:transform .25s cubic-bezier(.23,1,.32,1),box-shadow .25s,background .2s;
}
.p6-btn:hover{transform:translateY(-2px);background:#2eea73;box-shadow:0 12px 32px -6px rgba(37,211,102,.6),0 0 0 1px rgba(255,255,255,.12) inset}
.p6-btn svg{flex-shrink:0}
.p6-note{margin-top:18px;font-size:12px;color:var(--tw3)}

@media(max-width:520px){
  .p6-card{padding:36px 22px 28px;border-radius:22px}
}

.prow{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding-bottom:8px;-webkit-overflow-scrolling:touch}
.prow::-webkit-scrollbar{display:none}
.pc{flex:0 0 150px;height:240px;border-radius:14px;position:relative;cursor:pointer;overflow:hidden;opacity:0;transform:translateY(12px);transition:transform .4s cubic-bezier(.23,1,.32,1)}
.pc:hover{transform:translateY(-4px);border-color:rgba(255,255,255,.12)}
.sc.on .pc{opacity:1;transform:none}
.sc.on .pc-anim0{transition-delay:.1s}
.sc.on .pc-anim1{transition-delay:.18s}
.sc.on .pc-anim2{transition-delay:.26s}
.sc.on .pc-anim3{transition-delay:.34s}
.sc.on .pc-anim4{transition-delay:.42s}
.sc:not(.on) .pc{opacity:0;transform:translateY(12px)}
.pc-vid{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.pc-ov{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.7) 0%,rgba(0,0,0,0) 40%);display:flex;flex-direction:column;align-items:center;justify-content:center;transition:background .3s}
.pc:hover .pc-ov{background:linear-gradient(0deg,rgba(0,0,0,.8) 0%,rgba(0,0,0,.3) 40%)}
.pc-play{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.12);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;padding-left:2px;border:1px solid rgba(255,255,255,.15);transition:transform .3s,opacity .3s;opacity:.6}
.pc:hover .pc-play{transform:scale(1.1);opacity:1}
.pc-meta{position:absolute;bottom:10px;left:12px;right:12px}
.pc-name{font-family:var(--fd);font-weight:600;font-size:13px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.5)}
.pc-type{font-size:8px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-top:2px}

/* Video Modal */
.vm-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.85);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px;animation:vmFadeIn .3s}
@keyframes vmFadeIn{from{opacity:0}to{opacity:1}}
.vm-container{position:relative;max-width:400px;width:100%;animation:vmSlideIn .4s cubic-bezier(.23,1,.32,1)}
@keyframes vmSlideIn{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}
.vm-video{width:100%;border-radius:16px;background:#000;display:block;max-height:80vh;object-fit:contain}
.vm-close{position:absolute;top:-40px;right:0;background:none;border:none;color:rgba(255,255,255,.6);font-size:28px;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:color .2s,background .2s}
.vm-close:hover{color:#fff;background:rgba(255,255,255,.1)}
.vm-info{display:flex;justify-content:space-between;align-items:center;padding:12px 4px 0}
.vm-name{font-family:var(--fd);font-weight:600;font-size:14px;color:#fff}
.vm-type{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.pc-stat{font-size:10px;color:var(--tw3);font-weight:500}

.fw{max-width:560px;width:100%;text-align:left}
.faq-t{font-family:var(--fd);font-weight:600;font-size:clamp(20px,3vw,30px);letter-spacing:-.03em;margin-bottom:30px;color:var(--tw)}
.fi{border-top:1px solid rgba(255,255,255,.08)}
.fi:last-child{border-bottom:1px solid rgba(255,255,255,.08)}
.fiq{display:flex;align-items:center;justify-content:space-between;padding:18px 0;cursor:pointer;font-size:15px;font-weight:600;color:var(--tw);transition:color .2s;background:none;border:none;width:100%;text-align:left;font-family:var(--fb)}
.fiq:hover,.fiq.open{color:var(--tw2)}
.fiq::after{content:'+';font-size:18px;font-weight:300;color:var(--tw3);transition:transform .3s;flex-shrink:0;margin-left:16px}
.fiq.open::after{transform:rotate(45deg)}
.fia{overflow:hidden;max-height:0;transition:max-height .4s cubic-bezier(.23,1,.32,1),padding .4s}
.fia.open{max-height:200px;padding-bottom:18px}
.fia p{font-size:14px;color:var(--tw2);line-height:1.5;max-width:460px}

/* Dashboard mockup — light theme */
.dash{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;overflow-x:auto;scrollbar-width:none}
.dash::-webkit-scrollbar{display:none}
@media(max-width:700px){.dash{grid-template-columns:repeat(4,200px)}}
.dash-col{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;min-height:120px}
.dash-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.06)}
.dash-hd span:first-child{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--tw3)}
.dash-cnt{font-size:9px;font-weight:700;background:rgba(255,255,255,.08);color:var(--tw3);padding:1px 6px;border-radius:100px}
.d-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px;margin-bottom:6px;opacity:0;transition:opacity .5s,transform .5s cubic-bezier(.23,1,.32,1);transform:translateY(8px)}
.sc.on .d-card{opacity:1;transform:none}
.sc.on .d-anim1{transition-delay:.15s}
.sc.on .d-anim2{transition-delay:.3s}
.sc.on .d-anim3{transition-delay:.45s}
.sc.on .d-anim4{transition-delay:.6s}
.sc.on .d-anim5{transition-delay:.75s}
.sc:not(.on) .d-card{opacity:0;transform:translateY(8px)}
.d-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.d-type{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--tw);background:rgba(255,255,255,.1);padding:2px 6px;border-radius:100px}
.d-editor{font-size:9px;color:var(--tw3)}
.d-title{font-size:12px;font-weight:600;color:var(--tw);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
.d-sla{font-size:10px;font-weight:600;font-family:var(--fd);display:flex;align-items:center;gap:4px}
.d-sla::before{content:'';width:5px;height:5px;border-radius:50%;flex-shrink:0}
.d-sla-g{color:hsl(145,50%,50%)}.d-sla-g::before{background:hsl(145,50%,50%)}
.d-sla-y{color:hsl(43,80%,50%)}.d-sla-y::before{background:hsl(43,80%,50%)}
.d-sla-ok{color:hsl(145,50%,50%)}.d-sla-ok::before{background:hsl(145,50%,50%)}
.d-sla-done{color:var(--tw3)}.d-sla-done::before{background:var(--tw3)}
.d-bar{height:3px;background:rgba(255,255,255,.08);border-radius:10px;overflow:hidden;margin-top:6px}
.d-fill{height:100%;border-radius:10px;background:var(--tw)}
.d-fill-anim{width:0 !important}
.sc.on .d-fill-anim{animation:dfill 2s .6s forwards}
@keyframes dfill{to{width:62%}}
@keyframes dashScroll{0%{transform:translateX(0)}100%{transform:translateX(-40%)}}
.sc:not(.on) .d-fill-anim{animation:none}
.d-actions{display:flex;gap:4px;margin-top:6px}
.d-btn-rev{font-size:9px;font-weight:600;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.12);color:var(--tw3)}
.d-btn-ok{font-size:9px;font-weight:600;padding:4px 8px;border-radius:6px;background:#F5F5F7;color:#0A0A0A}

/* Orbit */
.orbit{position:relative;width:260px;height:260px;margin:0 auto}
@media(min-width:600px){.orbit{width:320px;height:320px}}
.orbit-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;color:rgba(255,255,255,.08);z-index:2}
.orbit-spin{position:absolute;top:50%;left:50%;border-radius:50%;border:1px solid rgba(255,255,255,.06)}
.orbit-r1{width:160px;height:160px;margin:-80px 0 0 -80px;animation:ospin 20s linear infinite}
@media(min-width:600px){.orbit-r1{width:190px;height:190px;margin:-95px 0 0 -95px}}
.orbit-r2{width:260px;height:260px;margin:-130px 0 0 -130px;animation:ospin 35s linear infinite reverse}
@media(min-width:600px){.orbit-r2{width:320px;height:320px;margin:-160px 0 0 -160px}}
@keyframes ospin{to{transform:rotate(360deg)}}
/* Orbit items: wrapper positions on ring, inner stays upright */
.orbit-r1{--r1:80px}.orbit-r2{--r2:130px}
@media(min-width:600px){.orbit-r1{--r1:95px}.orbit-r2{--r2:160px}}
.oi-wrap{position:absolute;top:50%;left:50%;width:0;height:0}
/* Counter-rotate wrapper content to stay upright */
.oi-icon{display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.oi-i1{animation:ocr1 20s linear infinite}
.oi-i2{animation:ocr2 35s linear infinite}
@keyframes ocr1{from{rotate:0deg}to{rotate:-360deg}}
@keyframes ocr2{from{rotate:0deg}to{rotate:360deg}}
/* Icon circle — plain gray */
.oi{width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:rgba(255,255,255,.6);position:relative;overflow:hidden}
.oi::before{content:'';position:absolute;inset:-1px;border-radius:50%;background:conic-gradient(#00DC82,#32B4FF,#9C6ADE,#E040FB,#FF69B4,#FF7B6B,#FF8C42,#FFD43B,#00DC82);animation:oispin 4s linear infinite}
.oi::after{content:'';position:absolute;inset:.5px;border-radius:50%;background:#0a0a0a}
.oi span{position:relative;z-index:1}
@keyframes oispin{to{transform:rotate(360deg)}}

.dots{position:fixed;right:24px;top:50%;transform:translateY(-50%);z-index:90;display:flex;flex-direction:column;gap:10px}
@media(max-width:600px){.dots{display:none}}

/* ═══ MOBILE OPTIMIZATIONS ═══ */
@media(max-width:600px){
  /* Scroll — shorter on mobile for faster scene changes */
  .scroll-driver{height:600dvh}

  /* Hero — compact */
  .hero-text{padding:16px 20px}
  .hl{font-size:clamp(32px,10vw,48px)}
  .hm{font-size:clamp(20px,5.5vw,28px)}
  .sb{font-size:12px;max-width:260px;margin-top:12px}
  .br{margin-top:16px;gap:6px}
  .bd{padding:8px 18px;font-size:12px}
  .bg-btn{padding:8px 14px;font-size:11px}
  .scroll-line{bottom:24px;height:36px}

  /* Scenes — centered, scrollable if overflow */
  .sc{padding:16px;overflow-y:auto;-webkit-overflow-scrolling:touch}

  /* Blobs — bigger to cover faster */
  .blob{min-width:55vw;min-height:55vw}

  /* Goo — lighter for mobile GPU */
  .goo{filter:blur(12px) contrast(4);will-change:auto}

  /* Features — smaller, tighter */
  .fts{gap:6px;margin-top:16px}
  .ft{padding:12px}
  .ft-t{font-size:12px}
  .ft-d{font-size:10px}

  /* Pricing — stack vertically */
  .pg{gap:16px;margin-top:16px;flex-direction:column}
  .pl{flex-direction:column;gap:4px;align-items:flex-start}
  .pval{font-size:clamp(28px,8vw,40px)}
  .slr{font-size:8px}

  /* Dashboard mockup — compact */
  .dash{grid-template-columns:repeat(2,1fr);gap:6px;overflow:visible}
  .dash-col{padding:10px;min-height:auto}
  .d-title{font-size:10px}
  .d-card{padding:6px;border-radius:6px}
  .d-name{font-size:9px}
  .d-bar{height:2px}

  /* Portfolio — smaller on mobile */
  .prow{gap:8px}
  .pc{flex:0 0 120px;height:200px;border-radius:10px}
  .pc-play{opacity:1;width:28px;height:28px;font-size:10px}
  .pc-name{font-size:11px}
  .pc-type{font-size:7px}
  .vm-container{max-width:92vw}

  /* Dashboard — 2x2 grid, no scroll needed */

  /* FAQ — tighter */
  .fw{max-width:100%}
  .faq-t{font-size:clamp(16px,5vw,22px);margin-bottom:16px}
  .fiq{font-size:13px;padding:12px 0}
  .fia p{font-size:12px}

  /* Orbit — much smaller */
  .orbit{width:180px;height:180px}
  .orbit-r1{width:110px;height:110px;margin:-55px 0 0 -55px;--r1:55px}
  .orbit-r2{width:180px;height:180px;margin:-90px 0 0 -90px;--r2:90px}
  .oi{width:22px;height:22px;margin:-11px 0 0 -11px;font-size:7px}

  /* Nav — smaller */
  .nv{padding:8px 12px}
  .nv-logo{font-size:14px}
  .nv-logo img{width:20px;height:20px}
  .nv-c{padding:6px 14px;font-size:11px}

  /* Footer */
  .fo{padding:16px;flex-direction:column;align-items:center;text-align:center;gap:10px}
  .fl{flex-wrap:wrap;justify-content:center;gap:10px}
  .fl a{font-size:11px}
}
.dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.15);transition:background .3s,transform .3s}
.dot.on{background:#fff;transform:scale(1.4)}

.fo{position:relative;z-index:50;padding:30px 32px;border-top:1px solid rgba(255,255,255,.06);color:var(--tw3);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;background:#050505}
@media(min-width:768px){.fo{padding:30px 48px}}
.fo span{font-size:12px}
.fl{display:flex;gap:20px}
.fl a{font-size:12px;color:var(--tw3);transition:color .2s}
.fl a:hover{color:var(--tw)}
`;

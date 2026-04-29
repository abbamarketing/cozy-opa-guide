Remover a pergunta "Tem garantia?" / "Money-back guarantee?" do array `faq` em `src/pages/Landing.tsx`, nas duas versões de idioma:

- **PT (linha 111):** remover `{ q: 'Tem garantia?', a: 'O plano Standard tem 7 dias de garantia...' }`
- **EN (linha 226):** remover `{ q: 'Money-back guarantee?', a: 'The Standard plan has a 7-day guarantee...' }`

Resultado: FAQ passa de 6 para 5 perguntas em ambos idiomas. Nenhuma outra mudança necessária — o `.map()` que renderiza o FAQ é dinâmico.
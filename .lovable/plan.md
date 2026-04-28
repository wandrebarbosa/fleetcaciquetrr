Plano para corrigir a queda de resultados na sincronização Autotrac

Problema identificado

- A atualização anterior reduziu o lote para 3 veículos, mas o backend usa um único timeout de 15s compartilhado para os 3 veículos do lote.
- Quando a API da Autotrac demora em um ou mais veículos, esses veículos ficam marcados como erro definitivo imediatamente: "Tempo limite do lote excedido (15s)".
- A consulta também está retornando veículos duplicados/desinstalados da Autotrac, por exemplo nomes com "DESINSTALADO/DESISTALADA", o que desperdiça chamadas e pode gerar linhas extras para a mesma placa.
- Resultado prático: o processo não quebra mais por timeout geral, mas está desistindo cedo demais de muitos veículos. Por isso antes atualizava perto de 40 e agora fica em 23/25/26.

O que vou ajustar

1. Corrigir o timeout no backend Autotrac
   - Trocar o timeout compartilhado do lote por timeout individual por veículo.
   - Assim, um veículo lento não prejudica os outros do mesmo lote.
   - Retornar erro mais claro por veículo, diferenciando timeout de erro real da API.

2. Adicionar retentativa automática no frontend
   - Fazer a primeira passada em lotes de 3, como está hoje.
   - Separar automaticamente os veículos que retornarem timeout.
   - Reconsultar esses veículos em chamadas menores, de 1 em 1, com tempo maior.
   - Só marcar como erro final se o veículo falhar também nas retentativas.

3. Filtrar e deduplicar veículos da Autotrac
   - Ignorar veículos da Autotrac marcados como desinstalados/inativos no nome.
   - Quando a Autotrac retornar mais de um registro para a mesma placa, manter apenas o registro ativo preferencial.
   - Isso evita consultar códigos antigos e reduz erros desnecessários.

4. Melhorar o indicador de progresso
   - Mostrar fase principal: localizando veículos, consultando telemetria, reprocessando timeouts, processando resultados.
   - Atualizar o contador considerando também as retentativas, para o usuário ver progresso real.
   - Manter o resumo final com atualizados, ignorados e erros.

Arquivos que serão alterados

- `supabase/functions/autotrac-sync/index.ts`
  - Timeout por veículo.
  - Timeout configurável e validado por chamada.
  - Filtro/deduplicação dos veículos autorizados.
  - Logs melhores para diagnosticar veículos lentos.

- `src/pages/ImportarKmPage.tsx`
  - Fluxo de retentativas.
  - Progresso por etapa.
  - Mensagens finais mais claras.

Validação após aplicar

- Rodar a sincronização Autotrac novamente na tela `/importar-km`.
- Conferir se os veículos que hoje ficam com timeout são reprocessados automaticamente.
- Conferir se veículos desinstalados/duplicados deixam de entrar no processamento.
- Verificar se o total de veículos com KM disponível volta a ficar mais próximo do comportamento anterior, sem travar a sincronização inteira.
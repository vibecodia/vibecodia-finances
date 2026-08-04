# Lesson learned: carregando o Secret do backend a partir do `.env`

Durante o piloto local em `minikube`, o backend foi validado com o seguinte comando para criar ou atualizar o `Secret` no cluster sem alterar o manifest commitado:

```bash
kubectl create secret generic vibecodia-backend-secret \
  --from-env-file=/home/rodolfo-neto/git/00_VIBECODIA/DEV/vibecodia-finances/infra/docker/.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Por que isso foi útil
- Mantém o nome do `Secret` igual ao já definido no scaffold do Kubernetes.
- Reaproveita os valores reais do arquivo `.env` do projeto sem precisar editar o YAML versionado.
- Permite um piloto local rápido no cluster, sem regressar a rotina atual de Docker Compose.

### Observação
Como o `--from-env-file` lê todas as variáveis do arquivo, o `Secret` resultante pode incluir chaves de frontend e outras variáveis extras além das que o backend usa. Isso é aceitável para o piloto local, mas é um ponto que pode ser refinado depois para um `Secret` mais enxuto e específico por ambiente.


kubectl exec -it deploy/vibecodia-backend -- sh -lc '
echo "VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY";
echo "VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY";
echo "length public=$(printf "%s" "$VAPID_PUBLIC_KEY" | wc -c)";
echo "length private=$(printf "%s" "$VAPID_PRIVATE_KEY" | wc -c)";
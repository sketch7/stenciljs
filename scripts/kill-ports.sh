#!/usr/bin/env bash
# Kill all processes listening on the dev/preview port ranges:
#   3000–3002  shell + MFEs (vike dev/preview servers)
#   3100–3104  api (Hono)

RANGES=("3000-3005" "3100-3102" )

killed=0
ports=()
for range in "${RANGES[@]}"; do
  start="${range%-*}"
  end="${range#*-}"
  while IFS= read -r p; do ports+=("$p"); done < <(seq "$start" "$end")
done

for port in "${ports[@]}"; do
  if command -v lsof &>/dev/null; then
    # macOS / Linux / Git Bash with lsof
    pids=$(lsof -ti tcp:"$port" 2>/dev/null)
  else
    # Windows fallback via netstat + awk
    pids=$(netstat -ano 2>/dev/null \
      | tr -d '\r' \
      | awk -v p=":$port" '$2 ~ (p "$") && $4 == "LISTENING" { print $5 }' \
      | sort -u)
  fi

  for pid in $pids; do
    if kill -9 "$pid" 2>/dev/null; then
      echo "Killed PID $pid on port $port"
      ((killed++))
    else
      # Fallback for Windows where kill may not work
      if taskkill //F //PID "$pid" &>/dev/null; then
        echo "Killed PID $pid on port $port (taskkill)"
        ((killed++))
      fi
    fi
  done
done

if [[ $killed -eq 0 ]]; then
  echo "No processes found on ports ${RANGES[*]}"
else
  echo "Done — killed $killed process(es)"
fi

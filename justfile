# kuu.mbt 枝再編の移送 task 群 (2026-07 の spec-as-core 再編用)
# spec の正本は kawaz/kuu に移行済み。恒常運用の push はそちらの clone から行う。

# 旧実装枝 kuu-v0 を origin へ
push-kuu-v0:
    jj git push --remote origin --bookmark kuu-v0

# origin の main を push (削除予約 or 新 main の反映 — bookmark の状態に従う)
push-origin-main:
    jj git push --remote origin --bookmark main

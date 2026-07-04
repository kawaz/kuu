# kuu spec (仕様正本) の push
# 正本リポは kawaz/kuu (remote: kuu)。ast-spec bookmark を push する。
# (kawaz/kuu の独立 clone へ移行後は、そちらの justfile が正になる)

push:
    jj git push --remote kuu --bookmark ast-spec

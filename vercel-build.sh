set -eo pipefail # stop on the first failure, so a broken WASM build fails the deploy
curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 10.0
export PATH="$HOME/.dotnet:$PATH"
export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
dotnet workload install wasm-tools # the AOT compiler (RunAOTCompilation in wasm/ChestWeb.csproj)
npm run build:wasm
npm run build

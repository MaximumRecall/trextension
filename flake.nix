{
  description = "Firefox extension project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    nix-gitignore.url = "github:hercules-ci/gitignore.nix";
    nix-gitignore.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, flake-utils, nix-gitignore }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodeEnv = import ./node-env.nix {
          inherit (pkgs) lib stdenv pkgs runCommand;
          inherit (pkgs) python2 libtool writeTextFile writeShellScript;
          nodejs = pkgs.nodejs_18;
        };
        nodePackages = import ./node-packages.nix {
          inherit (pkgs) stdenv lib fetchurl fetchgit;
          inherit (nix-gitignore) nix-gitignore;
          inherit nodeEnv;
        };
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = [
            pkgs.git
            nodePackages.shell
          ];
        };
      }
    );
}

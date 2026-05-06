#!/usr/bin/env python3
"""ROADMAP 4.0 TB0.2 — Two-tower item-embedding training.

Trains a user × recipe two-tower model on the Food.com positive
interactions emitted by ingestFoodCom.ts. Discards the user tower
(those users aren't ours) and saves only the 64-dim recipe vectors
plus an id map to disk.

Output (writes both for downstream consumption):
  recipeEmbeddings.json   { "<recipeId>": [64 floats], ... }   ← Node consumes this
  recipeEmbeddings.npy    Float32 matrix [N, 64]               ← Python re-use
  recipeIdMap.json        ordered list of recipe ids matching .npy rows

Determinism: --seed flag pins torch + numpy + python RNG.

Usage:
  python trainItemEmbeddings.py \\
      --input  /path/to/food_com_interactions.json \\
      --output /path/to/recommender_out \\
      --epochs 5 --dim 64 --seed 42
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
from pathlib import Path

try:
    import numpy as np
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, Dataset
except ImportError as exc:  # pragma: no cover - exercised only when run for real
    sys.stderr.write(
        f"trainItemEmbeddings: missing dependency ({exc}). "
        "Run `pip install -r scripts/recommender/requirements.txt`.\n"
    )
    sys.exit(2)


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


class InteractionsDataset(Dataset):
    def __init__(self, interactions, user_ids, recipe_ids):
        self.user_idx = {u: i for i, u in enumerate(user_ids)}
        self.recipe_idx = {r: i for i, r in enumerate(recipe_ids)}
        self.pairs = [
            (self.user_idx[it["userId"]], self.recipe_idx[it["recipeId"]])
            for it in interactions
            if it["userId"] in self.user_idx and it["recipeId"] in self.recipe_idx
        ]

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, idx):
        u, r = self.pairs[idx]
        return torch.tensor(u, dtype=torch.long), torch.tensor(r, dtype=torch.long)


class TwoTower(nn.Module):
    def __init__(self, n_users: int, n_recipes: int, dim: int) -> None:
        super().__init__()
        self.user = nn.Embedding(n_users, dim)
        self.recipe = nn.Embedding(n_recipes, dim)
        nn.init.normal_(self.user.weight, std=0.05)
        nn.init.normal_(self.recipe.weight, std=0.05)

    def forward(self, u_idx: torch.Tensor, r_idx: torch.Tensor) -> torch.Tensor:
        u_vec = nn.functional.normalize(self.user(u_idx), dim=-1)
        r_vec = nn.functional.normalize(self.recipe(r_idx), dim=-1)
        return (u_vec * r_vec).sum(dim=-1)


def train(
    interactions_path: Path,
    output_dir: Path,
    dim: int,
    epochs: int,
    batch_size: int,
    lr: float,
    seed: int,
) -> dict:
    set_seed(seed)
    output_dir.mkdir(parents=True, exist_ok=True)

    with interactions_path.open() as fh:
        snapshot = json.load(fh)

    interactions = snapshot["interactions"]
    if not interactions:
        raise ValueError("trainItemEmbeddings: no interactions in input")

    user_ids = sorted({it["userId"] for it in interactions})
    recipe_ids = sorted({it["recipeId"] for it in interactions})

    ds = InteractionsDataset(interactions, user_ids, recipe_ids)
    loader = DataLoader(ds, batch_size=batch_size, shuffle=True)

    model = TwoTower(len(user_ids), len(recipe_ids), dim)
    opt = torch.optim.Adam(model.parameters(), lr=lr)

    n_recipes = len(recipe_ids)
    for _ in range(epochs):
        for u_idx, r_idx in loader:
            opt.zero_grad()
            pos = model(u_idx, r_idx)
            # Sampled-softmax style negative for each positive.
            neg_idx = torch.randint(0, n_recipes, r_idx.shape)
            neg = model(u_idx, neg_idx)
            loss = (1 - pos + neg).clamp(min=0).mean()
            loss.backward()
            opt.step()

    with torch.no_grad():
        recipe_vecs = nn.functional.normalize(model.recipe.weight, dim=-1)
    matrix = recipe_vecs.cpu().numpy().astype("float32")

    # JSON (Node consumer)
    json_out = {str(rid): matrix[i].tolist() for i, rid in enumerate(recipe_ids)}
    (output_dir / "recipeEmbeddings.json").write_text(json.dumps(json_out))

    # .npy + id map (Python re-use)
    np.save(output_dir / "recipeEmbeddings.npy", matrix)
    (output_dir / "recipeIdMap.json").write_text(json.dumps(recipe_ids))

    return {"n_recipes": len(recipe_ids), "dim": dim}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--dim", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    summary = train(
        Path(args.input),
        Path(args.output),
        args.dim,
        args.epochs,
        args.batch_size,
        args.lr,
        args.seed,
    )
    print(json.dumps(summary))


if __name__ == "__main__":
    main()

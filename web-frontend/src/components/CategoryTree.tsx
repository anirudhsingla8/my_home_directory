import axios from "axios";
import { useEffect, useState } from "react";

import { CategoryNode, fetchCategoryTree } from "../api";
import { useInventory } from "../context/InventoryContext";

type TreeBranchProps = {
  expandedIds: Set<string>;
  nodes: CategoryNode[];
  onNodeClick: (node: CategoryNode) => void;
  selectedCategoryId?: string;
  toggleNode: (nodeId: string) => void;
};

const TreeBranch = ({
  expandedIds,
  nodes,
  onNodeClick,
  selectedCategoryId,
  toggleNode
}: TreeBranchProps) => {
  return (
    <ul className="space-y-2" role="tree">
      {nodes.map((node) => {
        const isExpanded = expandedIds.has(node.id);
        const isSelected = selectedCategoryId === node.id;
        const hasChildren = node.children.length > 0;

        return (
          <li key={node.id} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleNode(node.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
                  aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                >
                  {isExpanded ? "−" : "+"}
                </button>
              ) : (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-xs text-slate-400">
                  •
                </span>
              )}

              <button
                type="button"
                onClick={() => onNodeClick(node)}
                className={`flex-1 rounded-2xl px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-amber-300/70 text-slate-950 shadow-sm"
                    : "bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950"
                }`}
              >
                <span className="font-medium">{node.name}</span>
                {hasChildren ? (
                  <span className="ml-2 text-xs text-slate-500">{node.children.length} nested</span>
                ) : null}
              </button>
            </div>

            {hasChildren && isExpanded ? (
              <div className="ml-5 border-l border-dashed border-slate-300 pl-4 pt-2">
                <TreeBranch
                  expandedIds={expandedIds}
                  nodes={node.children}
                  onNodeClick={onNodeClick}
                  selectedCategoryId={selectedCategoryId}
                  toggleNode={toggleNode}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export function CategoryTree() {
  const { userId, selectedCategory, setSelectedCategory } = useInventory();
  const selectedCategoryId = selectedCategory?.id;
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCategories([]);
      setExpandedIds(new Set());
      setError(null);
      return;
    }

    const loadTree = async () => {
      setLoading(true);
      setError(null);

      try {
        const tree = await fetchCategoryTree(userId);
        setCategories(tree);
        setExpandedIds(new Set(tree.map((node) => node.id)));
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message ?? "Could not load categories.");
        } else {
          setError("Could not load categories.");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadTree();
  }, [userId]);

  const toggleNode = (nodeId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      return next;
    });
  };

  const handleNodeClick = (node: CategoryNode) => {
    if (node.children.length > 0) {
      toggleNode(node.id);
    }

    setSelectedCategory(node.id === selectedCategoryId ? null : node);
  };

  return (
    <section className="rounded-[28px] border border-white/60 bg-slate-50/80 p-5 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.8)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Categories
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Collapsible Category Tree</h2>
        </div>
      </div>

      {!userId ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
          Enter a user ID to load that inventory tree.
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">Loading categories...</p>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {!loading && !error && userId && categories.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
          No categories found for this user yet.
        </p>
      ) : null}

      {!loading && !error && categories.length > 0 ? (
        <TreeBranch
          expandedIds={expandedIds}
          nodes={categories}
          onNodeClick={handleNodeClick}
          selectedCategoryId={selectedCategoryId}
          toggleNode={toggleNode}
        />
      ) : null}
    </section>
  );
}

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

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

const TreeBranch = ({
  expandedIds,
  nodes,
  onNodeClick,
  selectedCategoryId,
  toggleNode
}: TreeBranchProps) => {
  return (
    <ul className="space-y-0.5" role="tree">
      {nodes.map((node) => {
        const isExpanded = expandedIds.has(node.id);
        const isSelected = selectedCategoryId === node.id;
        const hasChildren = node.children.length > 0;

        return (
          <li key={node.id} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
            <div className="flex items-center">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                >
                  <ChevronIcon open={isExpanded} />
                </button>
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                </span>
              )}

              <button
                type="button"
                onClick={() => onNodeClick(node)}
                className={`flex-1 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
                  isSelected
                    ? "bg-amber-100 font-semibold text-amber-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {node.name}
                {hasChildren && (
                  <span className={`ml-1.5 text-[11px] ${isSelected ? "text-amber-600" : "text-slate-400"}`}>
                    {node.children.length}
                  </span>
                )}
              </button>
            </div>

            {hasChildren && isExpanded && (
              <div className="ml-3 border-l border-slate-200 pl-2 mt-0.5">
                <TreeBranch
                  expandedIds={expandedIds}
                  nodes={node.children}
                  onNodeClick={onNodeClick}
                  selectedCategoryId={selectedCategoryId}
                  toggleNode={toggleNode}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export function CategoryTree() {
  const { selectedCategory, setSelectedCategory } = useInventory();
  const selectedCategoryId = selectedCategory?.id;
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTree = async () => {
      setLoading(true);
      setError(null);

      try {
        const tree = await fetchCategoryTree();
        setCategories(tree);
        // Start collapsed — keeps the sidebar compact, especially on mobile.
        // Users expand on demand via the chevron.
        setExpandedIds(new Set());
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
  }, []);

  const toggleNode = (nodeId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Categories</h2>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
          Loading...
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      {!loading && !error && categories.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-400">
          No categories yet
        </p>
      )}

      {!loading && !error && categories.length > 0 && (
        <TreeBranch
          expandedIds={expandedIds}
          nodes={categories}
          onNodeClick={handleNodeClick}
          selectedCategoryId={selectedCategoryId}
          toggleNode={toggleNode}
        />
      )}
    </section>
  );
}

import axios from "axios";
import { KeyboardEvent, useEffect, useRef, useState } from "react";

import {
  CategoryNode,
  deleteCategory,
  fetchCategoryTree,
  renameCategory,
  seedDefaultCategories,
  showToast
} from "../api";
import { useAuth } from "../context/AuthContext";
import { useInventory } from "../context/InventoryContext";

type TreeBranchProps = {
  editingId: string | null;
  editValue: string;
  expandedIds: Set<string>;
  isAdmin: boolean;
  nodes: CategoryNode[];
  onCancelEdit: () => void;
  onCommitEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
  onEditValueChange: (value: string) => void;
  onNodeClick: (node: CategoryNode) => void;
  onStartEdit: (node: CategoryNode) => void;
  pendingId: string | null;
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

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L4 13.172V16h2.828l7.379-7.379-2.828-2.828z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const TreeBranch = ({
  editingId,
  editValue,
  expandedIds,
  isAdmin,
  nodes,
  onCancelEdit,
  onCommitEdit,
  onDelete,
  onEditValueChange,
  onNodeClick,
  onStartEdit,
  pendingId,
  selectedCategoryId,
  toggleNode
}: TreeBranchProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, node: CategoryNode) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommitEdit(node);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancelEdit();
    }
  };

  return (
    <ul className="space-y-0.5" role="tree">
      {nodes.map((node) => {
        const isExpanded = expandedIds.has(node.id);
        const isSelected = selectedCategoryId === node.id;
        const hasChildren = node.children.length > 0;
        const isEditing = editingId === node.id;
        const isPending = pendingId === node.id;

        return (
          <li key={node.id} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
            <div className="group flex items-center">
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

              {isEditing ? (
                <div className="flex flex-1 items-center gap-1 px-1">
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => onEditValueChange(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, node)}
                    disabled={isPending}
                    className="min-w-0 flex-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-[13px] text-slate-900 outline-none ring-1 ring-amber-200 focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => onCommitEdit(node)}
                    disabled={isPending || !editValue.trim()}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40"
                    aria-label="Save"
                  >
                    <CheckIcon />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    disabled={isPending}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                    aria-label="Cancel"
                  >
                    <XIcon />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onNodeClick(node)}
                    className={`flex-1 truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
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

                  <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onStartEdit(node); }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Rename ${node.name}`}
                      title="Rename"
                    >
                      <PencilIcon />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(node); }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Delete ${node.name}`}
                        title="Delete (admin)"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {hasChildren && isExpanded && (
              <div className="ml-3 border-l border-slate-200 pl-2 mt-0.5">
                <TreeBranch
                  editingId={editingId}
                  editValue={editValue}
                  expandedIds={expandedIds}
                  isAdmin={isAdmin}
                  nodes={node.children}
                  onCancelEdit={onCancelEdit}
                  onCommitEdit={onCommitEdit}
                  onDelete={onDelete}
                  onEditValueChange={onEditValueChange}
                  onNodeClick={onNodeClick}
                  onStartEdit={onStartEdit}
                  pendingId={pendingId}
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

const errorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
};

export function CategoryTree() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { selectedCategory, setSelectedCategory } = useInventory();
  const selectedCategoryId = selectedCategory?.id;
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const reloadOnceRef = useRef(false);

  const loadTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const tree = await fetchCategoryTree();
      setCategories(tree);
    } catch (err) {
      setError(errorMessage(err, "Could not load categories."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reloadOnceRef.current) return;
    reloadOnceRef.current = true;
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

  const handleStartEdit = (node: CategoryNode) => {
    setEditingId(node.id);
    setEditValue(node.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleCommitEdit = async (node: CategoryNode) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (trimmed === node.name) {
      handleCancelEdit();
      return;
    }
    setPendingId(node.id);
    try {
      await renameCategory(node.id, trimmed);
      showToast("Category renamed.", "success");
      handleCancelEdit();
      await loadTree();
    } catch (err) {
      showToast(errorMessage(err, "Could not rename category."), "error");
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (node: CategoryNode) => {
    const childCount = node.children.length;
    const warning = childCount > 0
      ? `Delete "${node.name}" and detach its ${childCount} subcategor${childCount === 1 ? "y" : "ies"}?`
      : `Delete "${node.name}"?`;
    if (!window.confirm(warning)) return;

    setPendingId(node.id);
    try {
      await deleteCategory(node.id);
      showToast("Category deleted.", "success");
      if (selectedCategoryId === node.id) {
        setSelectedCategory(null);
      }
      await loadTree();
    } catch (err) {
      showToast(errorMessage(err, "Could not delete category."), "error");
    } finally {
      setPendingId(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { created } = await seedDefaultCategories();
      showToast(
        created > 0
          ? `Seeded ${created} default categor${created === 1 ? "y" : "ies"}.`
          : "Default categories already present.",
        "success"
      );
      await loadTree();
    } catch (err) {
      showToast(errorMessage(err, "Could not seed defaults."), "error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Categories</h2>
        {isAdmin && (
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding || loading}
            className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-40"
            title="Populate the global tree from defaults (idempotent)"
          >
            {seeding ? "Seeding..." : "Seed defaults"}
          </button>
        )}
      </div>

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
          {isAdmin
            ? 'No categories yet. Click "Seed defaults" to populate the standard tree.'
            : "No categories yet. Ask an admin to seed the defaults."}
        </p>
      )}

      {!loading && !error && categories.length > 0 && (
        <TreeBranch
          editingId={editingId}
          editValue={editValue}
          expandedIds={expandedIds}
          isAdmin={isAdmin}
          nodes={categories}
          onCancelEdit={handleCancelEdit}
          onCommitEdit={handleCommitEdit}
          onDelete={handleDelete}
          onEditValueChange={setEditValue}
          onNodeClick={handleNodeClick}
          onStartEdit={handleStartEdit}
          pendingId={pendingId}
          selectedCategoryId={selectedCategoryId}
          toggleNode={toggleNode}
        />
      )}
    </section>
  );
}

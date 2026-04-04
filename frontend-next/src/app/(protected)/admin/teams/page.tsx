"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AuthGate from "@/components/common/auth-gate";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import Input from "@/components/common/input";
import Modal from "@/components/common/modal";
import Select from "@/components/common/select";
import Textarea from "@/components/common/textarea";
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberLead,
  getUsers,
} from "@/api/admin";
import type { Team, TeamDetail, TeamMember } from "@/types";

const QUERY_KEYS = {
  teams: ["admin-teams"] as const,
  team: (id: number) => ["admin-team", id] as const,
  workers: ["admin-workers"] as const,
};

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberIsLead, setAddMemberIsLead] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [error, setError] = useState("");

  const { data: teams = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.teams,
    queryFn: getTeams,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: QUERY_KEYS.workers,
    queryFn: getUsers,
  });

  const invalidateTeams = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams });

  const openTeam = async (team: Team) => {
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.team(team.id),
        queryFn: () => getTeam(team.id),
      });
      setSelectedTeam(detail);
      setAddMemberUserId("");
      setAddMemberIsLead(false);
      setError("");
    } catch {
      alert("Failed to load team. Please try again.");
    }
  };

  const refreshSelectedTeam = async () => {
    if (!selectedTeam) return;
    const detail = await getTeam(selectedTeam.id);
    setSelectedTeam(detail);
    void queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.team(selectedTeam.id),
    });
    void invalidateTeams();
  };

  const createMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      void invalidateTeams();
      setShowCreateModal(false);
      setFormName("");
      setFormDescription("");
    },
    onError: () => alert("Failed to create team."),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name: string; description?: string };
    }) => updateTeam(id, data),
    onSuccess: () => {
      void invalidateTeams();
      setEditTeam(null);
      setFormName("");
      setFormDescription("");
    },
    onError: () => alert("Failed to update team."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      void invalidateTeams();
      setSelectedTeam(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to delete team.";
      alert(msg);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({
      teamId,
      userId,
      isLead,
    }: {
      teamId: number;
      userId: number;
      isLead: boolean;
    }) => addTeamMember(teamId, userId, isLead),
    onSuccess: () => {
      void refreshSelectedTeam();
      setAddMemberUserId("");
      setAddMemberIsLead(false);
      setError("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to add member.";
      setError(msg);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      removeTeamMember(teamId, userId),
    onSuccess: () => void refreshSelectedTeam(),
    onError: () => alert("Failed to remove member."),
  });

  const toggleLeadMutation = useMutation({
    mutationFn: ({
      teamId,
      userId,
      isLead,
    }: {
      teamId: number;
      userId: number;
      isLead: boolean;
    }) => updateTeamMemberLead(teamId, userId, isLead),
    onSuccess: () => void refreshSelectedTeam(),
    onError: () => alert("Failed to update lead status."),
  });

  // Workers not already in any team (for the add member dropdown)
  const memberIds = new Set(selectedTeam?.members.map((m) => m.id) ?? []);
  const availableWorkers = allUsers.filter(
    (u) => u.role !== "admin" && !memberIds.has(u.id),
  );

  function openCreate() {
    setFormName("");
    setFormDescription("");
    setShowCreateModal(true);
  }

  function openEdit(team: Team) {
    setFormName(team.name);
    setFormDescription(team.description ?? "");
    setEditTeam(team);
  }

  function handleDelete(team: Team) {
    if (!confirm(`Delete team "${team.name}"? This action cannot be undone.`))
      return;
    deleteMutation.mutate(team.id);
  }

  return (
    <AuthGate adminOnly>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Teams</h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Manage teams and assign members
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            + New Team
          </Button>
        </div>

        <Card overflow>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              Loading…
            </div>
          ) : teams.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-2xl">👥</p>
              <p className="mt-2 text-sm text-text-secondary">No teams yet</p>
              <p className="text-xs text-text-disabled">
                Create one to start grouping workers
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Team", "Description", "Members", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-secondary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b border-border last:border-0 hover:bg-surface-alt"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {team.name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {team.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {team.member_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void openTeam(team)}
                        >
                          Manage
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(team)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(team)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Create team modal */}
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)}>
            <h2 className="mb-4 text-base font-semibold text-text-primary">
              New Team
            </h2>
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Team Name
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. GIPS Platform"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Description{" "}
                <span className="font-normal text-text-disabled">
                  (optional)
                </span>
              </label>
              <Textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What does this team do?"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() =>
                  createMutation.mutate({
                    name: formName,
                    description: formDescription || undefined,
                  })
                }
                disabled={!formName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating…" : "Create Team"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
            </div>
          </Modal>
        )}

        {/* Edit team modal */}
        {editTeam && (
          <Modal onClose={() => setEditTeam(null)}>
            <h2 className="mb-4 text-base font-semibold text-text-primary">
              Edit Team
            </h2>
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Team Name
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Description
              </label>
              <Textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() =>
                  updateMutation.mutate({
                    id: editTeam.id,
                    data: {
                      name: formName,
                      description: formDescription || undefined,
                    },
                  })
                }
                disabled={!formName.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
              <Button variant="secondary" onClick={() => setEditTeam(null)}>
                Cancel
              </Button>
            </div>
          </Modal>
        )}

        {/* Team detail / member management modal */}
        {selectedTeam && (
          <Modal onClose={() => setSelectedTeam(null)} wide>
            <h2 className="mb-1 text-base font-semibold text-text-primary">
              {selectedTeam.name}
            </h2>
            {selectedTeam.description && (
              <p className="mb-4 text-sm text-text-secondary">
                {selectedTeam.description}
              </p>
            )}

            {/* Members list */}
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
                Members ({selectedTeam.members.length})
              </h3>
              {selectedTeam.members.length === 0 ? (
                <p className="text-sm text-text-disabled">No members yet</p>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border">
                  {selectedTeam.members.map((member: TeamMember) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {member.name}
                          {member.is_lead && (
                            <span className="ml-2 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                              Lead
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {member.email}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            toggleLeadMutation.mutate({
                              teamId: selectedTeam.id,
                              userId: member.id,
                              isLead: !member.is_lead,
                            })
                          }
                          disabled={toggleLeadMutation.isPending}
                        >
                          {member.is_lead ? "Remove Lead" : "Make Lead"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            removeMemberMutation.mutate({
                              teamId: selectedTeam.id,
                              userId: member.id,
                            })
                          }
                          disabled={removeMemberMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add member */}
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
                Add Member
              </h3>
              {error && <p className="mb-2 text-sm text-danger">{error}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={addMemberUserId}
                  onChange={(e) => setAddMemberUserId(e.target.value)}
                  className="min-w-[180px]"
                >
                  <option value="">Select worker…</option>
                  {availableWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={addMemberIsLead}
                    onChange={(e) => setAddMemberIsLead(e.target.checked)}
                    className="accent-accent"
                  />
                  Team Lead
                </label>
                <Button
                  size="sm"
                  onClick={() =>
                    addMemberMutation.mutate({
                      teamId: selectedTeam.id,
                      userId: Number(addMemberUserId),
                      isLead: addMemberIsLead,
                    })
                  }
                  disabled={!addMemberUserId || addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? "Adding…" : "Add"}
                </Button>
              </div>
              {availableWorkers.length === 0 && (
                <p className="mt-2 text-xs text-text-disabled">
                  All workers are already in a team
                </p>
              )}
            </div>
          </Modal>
        )}
      </div>
    </AuthGate>
  );
}

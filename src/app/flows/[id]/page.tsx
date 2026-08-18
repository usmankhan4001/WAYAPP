'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Play,
  CheckCircle2,
  Plus,
  Trash2,
  Settings,
  MessageSquare,
  Sparkles,
  Zap,
  Tag,
  Split,
  Power,
  X,
  Send,
  RefreshCw,
} from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// -------------------------------------------------------------
// CUSTOM FLOW NODES
// -------------------------------------------------------------

function TriggerNode({ data, id }: { data: any; id: string }) {
  return (
    <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 shadow-xl min-w-[200px] text-white">
      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
        <Zap className="w-3.5 h-3.5" />
        <span>Trigger: {data.type || 'Inbound'}</span>
      </div>
      <div className="text-[11px] text-slate-300 font-medium">{data.text || 'Any Inbound Message'}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500 border-2 border-slate-900" />
    </div>
  );
}

function MessageNode({ data, id }: { data: any; id: string }) {
  return (
    <div className="bg-slate-900 border border-slate-700 hover:border-emerald-500 rounded-2xl p-4 shadow-xl min-w-[220px] max-w-[280px] text-white transition-all">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-500 border-2 border-slate-900" />
      <div className="flex items-center gap-2 text-blue-400 font-bold text-xs mb-1">
        <MessageSquare className="w-3.5 h-3.5" />
        <span>{data.label || 'Send Message'}</span>
      </div>
      <div className="text-[11px] text-slate-300 line-clamp-3 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
        {data.text || 'Enter message text...'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
    </div>
  );
}

function QuickReplyNode({ data, id }: { data: any; id: string }) {
  const buttons = data.buttons || [
    { id: 'btn_1', title: 'Option 1' },
    { id: 'btn_2', title: 'Option 2' },
  ];

  return (
    <div className="bg-slate-900 border border-purple-500/80 rounded-2xl p-4 shadow-xl min-w-[220px] text-white">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500 border-2 border-slate-900" />
      <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Quick Replies</span>
      </div>
      <div className="text-[11px] text-slate-300 mb-2">{data.text || 'Choose an option:'}</div>
      <div className="space-y-1">
        {buttons.map((b: any, idx: number) => (
          <div key={idx} className="bg-purple-950/40 border border-purple-800/60 rounded-md py-1 px-2 text-[10px] font-semibold text-purple-200">
            {b.title}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-slate-900" />
    </div>
  );
}

function ConditionNode({ data, id }: { data: any; id: string }) {
  return (
    <div className="bg-slate-900 border border-amber-500/80 rounded-2xl p-4 shadow-xl min-w-[200px] text-white">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500 border-2 border-slate-900" />
      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
        <Split className="w-3.5 h-3.5" />
        <span>Condition</span>
      </div>
      <div className="text-[11px] text-slate-300 font-mono bg-slate-950 p-1.5 rounded border border-slate-800">
        {data.field || 'input'} {data.operator || '=='} &quot;{data.value || ''}&quot;
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 bg-emerald-500 border-2 border-slate-900 left-1/3" />
      <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 bg-rose-500 border-2 border-slate-900 left-2/3" />
    </div>
  );
}

function ActionNode({ data, id }: { data: any; id: string }) {
  return (
    <div className="bg-slate-900 border border-teal-500/80 rounded-2xl p-4 shadow-xl min-w-[200px] text-white">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-teal-500 border-2 border-slate-900" />
      <div className="flex items-center gap-2 text-teal-400 font-bold text-xs mb-1">
        <Tag className="w-3.5 h-3.5" />
        <span>Action: {data.actionType || 'Update'}</span>
      </div>
      <div className="text-[11px] text-slate-300">{data.label || 'Apply Contact Action'}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-teal-500 border-2 border-slate-900" />
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  quick_reply: QuickReplyNode,
  condition: ConditionNode,
  action: ActionNode,
};

// -------------------------------------------------------------
// MAIN FLOW EDITOR COMPONENT
// -------------------------------------------------------------

export default function FlowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [flow, setFlow] = useState<any>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Simulator Drawer State
  const [showSimulator, setShowSimulator] = useState(false);
  const [simMessages, setSimMessages] = useState<{ sender: 'bot' | 'user'; text: string; buttons?: any[] }[]>([]);
  const [simInput, setSimInput] = useState('');
  const [simCurrentNodeId, setSimCurrentNodeId] = useState<string | null>(null);
  const [simVariables, setSimVariables] = useState<Record<string, any>>({});
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    async function loadFlow() {
      try {
        const res = await fetch(`/api/flows/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFlow(data);
          try {
            setNodes(JSON.parse(data.nodesJson || '[]'));
            setEdges(JSON.parse(data.edgesJson || '[]'));
          } catch {
            setNodes([]);
            setEdges([]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadFlow();
  }, [id]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
  };

  const handleAddNode = (type: string) => {
    const newNodeId = `node_${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type,
      position: { x: 300, y: (nodes.length + 1) * 120 },
      data: {
        label: `${type.toUpperCase()} Node`,
        text: type === 'message' ? 'Hello! How can we assist you today?' : undefined,
        type: type === 'trigger' ? 'ANY_INBOUND' : undefined,
        buttons: type === 'quick_reply' ? [{ id: 'btn_1', title: 'Sales' }, { id: 'btn_2', title: 'Support' }] : undefined,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
  };

  const handleUpdateSelectedNodeData = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updated = {
            ...n,
            data: { ...n.data, [key]: value },
          };
          setSelectedNode(updated);
          return updated;
        }
        return n;
      })
    );
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const handleSave = async (publishState?: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/flows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodesJson: JSON.stringify(nodes),
          edgesJson: JSON.stringify(edges),
          status: publishState !== undefined ? (publishState ? 'PUBLISHED' : 'DRAFT') : flow.status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFlow(data.flow);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Simulator Engine Trigger
  const startSimulation = async () => {
    setShowSimulator(true);
    setSimMessages([]);
    setSimCurrentNodeId(null);
    setSimVariables({ firstName: 'Alex' });
    setSimLoading(true);

    try {
      const res = await fetch(`/api/flows/${id}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Hi', variables: { firstName: 'Alex' } }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimCurrentNodeId(data.currentNodeId);
        setSimVariables(data.variables || {});
        if (data.message) {
          setSimMessages([{ sender: 'bot', text: data.message, buttons: data.buttons }]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  const sendSimulatorReply = async (userText: string) => {
    if (!userText.trim()) return;
    const newMsgs = [...simMessages, { sender: 'user' as const, text: userText }];
    setSimMessages(newMsgs);
    setSimInput('');
    setSimLoading(true);

    try {
      const res = await fetch(`/api/flows/${id}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userText,
          currentNodeId: simCurrentNodeId,
          variables: simVariables,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimCurrentNodeId(data.currentNodeId);
        setSimVariables(data.variables || {});
        if (data.message) {
          setSimMessages([...newMsgs, { sender: 'bot', text: data.message, buttons: data.buttons }]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  if (!flow) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPublished = flow.status === 'PUBLISHED';

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/flows"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">{flow.name}</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isPublished
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {flow.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">v{flow.version || 1} &bull; Visual Journey Canvas</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={startSimulation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Simulator</span>
          </button>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Draft'}</span>
          </button>

          <button
            onClick={() => handleSave(!isPublished)}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              isPublished
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isPublished ? 'Unpublish' : 'Publish Flow'}</span>
          </button>
        </div>
      </header>

      {/* Main Canvas + Sidebar Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Node Palette Floating Bar */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2 shadow-2xl flex items-center gap-1.5">
          <button
            onClick={() => handleAddNode('message')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-blue-600 text-xs font-semibold text-white transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>+ Message</span>
          </button>
          <button
            onClick={() => handleAddNode('quick_reply')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-purple-600 text-xs font-semibold text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>+ Quick Replies</span>
          </button>
          <button
            onClick={() => handleAddNode('condition')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-amber-600 text-xs font-semibold text-white transition-colors"
          >
            <Split className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Condition</span>
          </button>
          <button
            onClick={() => handleAddNode('action')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-teal-600 text-xs font-semibold text-white transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-teal-400" />
            <span>+ Action</span>
          </button>
        </div>

        {/* React Flow Editor */}
        <div className="flex-1 h-full bg-slate-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="bg-slate-900 border-slate-800 fill-white" />
          </ReactFlow>
        </div>

        {/* Selected Node Properties Sidebar */}
        {selectedNode && (
          <aside className="w-80 bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto space-y-5 shrink-0 z-10 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Node Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {(() => {
                const nodeData = (selectedNode.data || {}) as Record<string, any>;
                return (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Node Label</label>
                      <input
                        type="text"
                        value={String(nodeData.label || '')}
                        onChange={(e) => handleUpdateSelectedNodeData('label', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {selectedNode.type === 'message' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Message Body (supports {'{{firstName}}'}, {'{{phoneNumber}}'})
                        </label>
                        <textarea
                          rows={4}
                          value={String(nodeData.text || '')}
                          onChange={(e) => handleUpdateSelectedNodeData('text', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-sans"
                        />
                      </div>
                    )}

                    {selectedNode.type === 'quick_reply' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Prompt Text</label>
                          <input
                            type="text"
                            value={String(nodeData.text || '')}
                            onChange={(e) => handleUpdateSelectedNodeData('text', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Buttons</label>
                          <div className="space-y-2">
                            {(Array.isArray(nodeData.buttons) ? nodeData.buttons : []).map((btn: any, idx: number) => (
                              <input
                                key={idx}
                                type="text"
                                value={String(btn.title || '')}
                                onChange={(e) => {
                                  const newBtns = [...(Array.isArray(nodeData.buttons) ? nodeData.buttons : [])];
                                  newBtns[idx] = { ...newBtns[idx], title: e.target.value };
                                  handleUpdateSelectedNodeData('buttons', newBtns);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-purple-800/80 bg-slate-950 text-xs text-purple-200"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedNode.type === 'condition' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Variable Field</label>
                          <input
                            type="text"
                            value={String(nodeData.field || 'lastInput')}
                            onChange={(e) => handleUpdateSelectedNodeData('field', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Operator</label>
                          <select
                            value={String(nodeData.operator || 'equals')}
                            onChange={(e) => handleUpdateSelectedNodeData('operator', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs"
                          >
                            <option value="equals">Equals (==)</option>
                            <option value="contains">Contains</option>
                            <option value="greater_than">Greater Than (&gt;)</option>
                            <option value="less_than">Less Than (&lt;)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Value</label>
                          <input
                            type="text"
                            value={String(nodeData.value || '')}
                            onChange={(e) => handleUpdateSelectedNodeData('value', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleDeleteSelectedNode}
                  className="w-full py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Node</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Interactive Simulator Modal / Drawer */}
        {showSimulator && (
          <div className="absolute right-4 bottom-4 w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl z-30 flex flex-col h-[520px] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">Live Flow Simulator</h4>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={startSimulation}
                  title="Restart simulation"
                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setShowSimulator(false)}
                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat message bubbles */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {simMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.buttons && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.buttons.map((b: any, bIdx: number) => (
                        <button
                          key={bIdx}
                          onClick={() => sendSimulatorReply(b.title)}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 border border-purple-500/50 text-[11px] font-semibold text-purple-200 hover:text-white transition-colors"
                        >
                          {b.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {simLoading && (
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                  <span>Bot is thinking...</span>
                </div>
              )}
            </div>

            {/* Input area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendSimulatorReply(simInput);
              }}
              className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Type customer reply..."
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={simLoading || !simInput.trim()}
                className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { FiPlus, FiTrash2, FiCheck } from 'react-icons/fi';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string;
  createdAt: string;
}

interface TasksManagerProps {
  plannerRequestId?: number;
}

export const TasksManager = ({ plannerRequestId = 0 }: TasksManagerProps) => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Préparer la présentation',
      description: 'Finir les slides pour la réunion de lundi',
      priority: 'high',
      status: 'pending',
      dueDate: '2026-03-10',
      createdAt: '2026-03-09',
    },
    {
      id: '2',
      title: 'Réviser les documents',
      description: 'Examiner les rapports du trimestre',
      priority: 'medium',
      status: 'in-progress',
      dueDate: '2026-03-11',
      createdAt: '2026-03-09',
    },
    {
      id: '3',
      title: 'Envoyer les mails',
      description: 'Répondre aux emails clients en attente',
      priority: 'medium',
      status: 'pending',
      dueDate: '2026-03-09',
      createdAt: '2026-03-09',
    },
  ]);

  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  });

  const [showForm, setShowForm] = useState(false);
  const shouldShowForm = plannerRequestId > 0 || showForm;

  const addTask = () => {
    if (newTask.title.trim()) {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: 'pending',
        dueDate: newTask.dueDate,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setTasks([task, ...tasks]);
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
      setShowForm(false);
    }
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const toggleTaskStatus = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status: task.status === 'completed' ? 'pending' : 'completed',
            }
          : task
      )
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in-progress':
        return 'text-blue-600';
      case 'pending':
        return 'text-gray-600';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complétée';
      case 'in-progress':
        return 'En cours';
      case 'pending':
        return 'En attente';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Task Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Mes Tâches</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#01333D] text-white px-4 py-2 rounded-lg hover:opacity-90 transition font-medium"
        >
          <FiPlus size={20} />
          Ajouter une tâche
        </button>
      </div>

      {/* Add Task Form */}
      {shouldShowForm && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre de la tâche *
            </label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Ex: Préparer la présentation"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01333D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Détails de la tâche"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01333D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorité
              </label>
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    priority: e.target.value as 'high' | 'medium' | 'low',
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01333D]"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Échéance
              </label>
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01333D]"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              onClick={addTask}
              className="px-4 py-2 bg-[#01333D] text-white rounded-lg hover:opacity-90 transition font-medium"
            >
              Créer la tâche
            </button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">Aucune tâche. Créez une nouvelle tâche pour commencer.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition"
            >
              <div className="flex gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTaskStatus(task.id)}
                  className={`flex-shrink-0 mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${
                    task.status === 'completed'
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {task.status === 'completed' && (
                    <FiCheck size={16} className="text-white" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-semibold text-gray-800 mb-1 ${
                      task.status === 'completed'
                        ? 'line-through text-gray-500'
                        : ''
                    }`}
                  >
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  )}

                  {/* Tags and metadata */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Priority Badge */}
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority === 'high'
                        ? 'Haute priorité'
                        : task.priority === 'medium'
                        ? 'Priorité moyenne'
                        : 'Basse priorité'}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(
                        task.status
                      )}`}
                    >
                      {getStatusLabel(task.status)}
                    </span>

                    {/* Due Date */}
                    {task.dueDate && (
                      <span className="text-xs text-gray-500">
                        📅 {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Supprimer la tâche"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

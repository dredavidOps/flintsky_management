import React from 'react';
import './DataTable.css';

const DataTable = ({ columns, data, onEdit, onDelete, loading }) => {
  if (loading) {
    return <div className="table-loading">Loading...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="table-empty">No data available</div>;
  }

  return (
    <div className="table-container">
      <table className="data-table-component">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {(onEdit || onDelete) && <th className="actions-column">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={item.id || idx}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(item[col.key], item) : item[col.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="actions-cell">
                  {onEdit && (
                    <button
                      className="btn-edit"
                      onClick={() => onEdit(item)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="btn-delete"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this item?')) {
                          onDelete(item.id);
                        }
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

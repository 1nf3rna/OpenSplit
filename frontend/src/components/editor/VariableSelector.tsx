import { Dispatch, SetStateAction } from "react";

import { SelectedVariable, Variable } from "./types";

type VariableSelectorProps = {
    variables: Variable[];
    selectedVariables: Record<string, SelectedVariable>;
    setSelectedVariables: Dispatch<SetStateAction<Record<string, SelectedVariable>>>;
};

export default function VariableSelector({
    variables,
    selectedVariables,
    setSelectedVariables,
}: VariableSelectorProps) {
    if (variables.length === 0) {
        return null;
    }

    return (
        <>
            <label>Variables</label>

            <div className="variable-row">
                {variables.map((variable) => (
                    <div key={variable.id} className="variable">
                        <label htmlFor={`variable-${variable.id}`}>{variable.name}</label>

                        <select
                            id={`variable-${variable.id}`}
                            value={selectedVariables[variable.id]?.value ?? ""}
                            onChange={(e) => {
                                const option = variable.options.find((o) => o.id === e.target.value);

                                setSelectedVariables((prev) => ({
                                    ...prev,
                                    [variable.id]: {
                                        name: variable.name,
                                        value: e.target.value,
                                        label: option?.label ?? "",
                                    },
                                }));
                            }}
                        >
                            <option value=""></option>

                            {variable.options.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </>
    );
}

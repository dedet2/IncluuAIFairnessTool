import sys
import json
import pandas as pd
import numpy as np
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric

def detect_bias(preprocessed_data, label_names, protected_attribute_names, dataset_type, reference_religion):
    try:
        print(f"Preprocessed data: {preprocessed_data[:5]}", file=sys.stderr)
        print(f"Label names: {label_names}", file=sys.stderr)
        print(f"Protected attribute names: {protected_attribute_names}", file=sys.stderr)
        
        df = pd.DataFrame(preprocessed_data)
        print(f"DataFrame columns: {df.columns.tolist()}", file=sys.stderr)
        
        # Create a mapping for attributes with and without spaces
        attr_mapping = {attr.replace(' ', ''): attr for attr in protected_attribute_names}
        attr_mapping.update({attr: attr for attr in protected_attribute_names})
        
        if 'Religion_reference' in df.columns and 'Religion_reference' not in protected_attribute_names:
            protected_attribute_names.append('Religion_reference')
            attr_mapping['Religion_reference'] = 'Religion_reference'

        # Find available protected attributes in the dataframe
        available_protected_attributes = [
            attr for attr in protected_attribute_names 
            if attr in df.columns or attr.replace(' ', '') in df.columns
        ]
        
        # Rename columns if necessary
        df.rename(columns={attr.replace(' ', ''): attr for attr in available_protected_attributes}, inplace=True)
        
        print(f"Available protected attributes: {available_protected_attributes}", file=sys.stderr)
        
        dataset = BinaryLabelDataset(favorable_label=1, unfavorable_label=0,
                                     df=df,
                                     label_names=label_names,
                                     protected_attribute_names=available_protected_attributes)

        metrics = {}
        for attr in available_protected_attributes:
            print(f"Processing attribute: {attr}", file=sys.stderr)
            column_name = attr if attr in df.columns else attr.replace(' ', '')
            if attr == 'Race':
                metrics[attr] = calculate_race_metrics(dataset, column_name)
            elif attr == 'Education':
                metrics[attr] = calculate_education_metrics(dataset, column_name)
            else:
                metrics[attr] = calculate_binary_metrics(dataset, column_name)

        print(f"Calculated bias metrics: {metrics}", file=sys.stderr)
        return metrics
    except Exception as e:
        print(f"Error in detect_bias: {str(e)}", file=sys.stderr)
        import traceback
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        return {'error': str(e)}

def calculate_outcome_rates(dataset, protected_attributes):
    outcome_rates = {}
    for attr in protected_attributes:
        privileged_mask = dataset.protected_attributes[:, dataset.protected_attribute_names.index(attr)] == 1.0
        unprivileged_mask = dataset.protected_attributes[:, dataset.protected_attribute_names.index(attr)] == 0.0
        
        privileged_rate = np.mean(dataset.labels[privileged_mask] == dataset.favorable_label)
        unprivileged_rate = np.mean(dataset.labels[unprivileged_mask] == dataset.favorable_label)
        
        outcome_rates[attr] = {
            'privileged': float(privileged_rate),
            'unprivileged': float(unprivileged_rate)
        }
    return outcome_rates

def calculate_binary_metrics(dataset, attr):
    privileged_groups = [{attr: 1.0}]
    unprivileged_groups = [{attr: 0.0}]

    binary_metric = BinaryLabelDatasetMetric(dataset, 
                                             unprivileged_groups=unprivileged_groups, 
                                             privileged_groups=privileged_groups)

    metrics = {
        'statistical_parity_difference': binary_metric.statistical_parity_difference(),
        'disparate_impact': binary_metric.disparate_impact(),
    }

    return handle_nan_inf(metrics)

def calculate_race_metrics(dataset, attr):
    race_mapping = {0.0: 'Black', 1.0: 'Hispanic', 2.0: 'Asian', 3.0: 'White'}
    race_values = sorted(set(dataset.protected_attributes[:, dataset.protected_attribute_names.index(attr)]))
    metrics = {'overall': {}, 'group_metrics': {}}

    for reference_race in race_values:
        privileged_groups = [{attr: reference_race}]
        other_races = [race for race in race_values if race != reference_race]

        metrics['group_metrics'][race_mapping[reference_race]] = {}

        for comparison_race in other_races:
            unprivileged_groups = [{attr: comparison_race}]
            binary_metric = BinaryLabelDatasetMetric(dataset, 
                                                     unprivileged_groups=unprivileged_groups, 
                                                     privileged_groups=privileged_groups)

            race_pair_metrics = {
                'statistical_parity_difference': binary_metric.statistical_parity_difference(),
                'disparate_impact': binary_metric.disparate_impact(),
            }

            metrics['group_metrics'][race_mapping[reference_race]][race_mapping[comparison_race]] = handle_nan_inf(race_pair_metrics)

    privileged_groups = [{attr: 3.0}]  # 3 corresponds to White
    unprivileged_groups = [{attr: race} for race in race_values if race != 3.0]

    overall_metric = BinaryLabelDatasetMetric(dataset, 
                                              unprivileged_groups=unprivileged_groups, 
                                              privileged_groups=privileged_groups)

    metrics['overall'] = handle_nan_inf({
        'statistical_parity_difference': overall_metric.statistical_parity_difference(),
        'disparate_impact': overall_metric.disparate_impact(),
    })

    return metrics

def calculate_education_metrics(dataset, attr):
    education_mapping = {0.0: 'High School', 1.0: 'Bachelor', 2.0: 'Master', 3.0: 'PhD'}
    education_values = sorted(set(dataset.protected_attributes[:, dataset.protected_attribute_names.index(attr)]))
    metrics = {'overall': {}, 'group_metrics': {}}

    for reference_level in education_values:
        privileged_groups = [{attr: reference_level}]
        other_levels = [level for level in education_values if level != reference_level]

        metrics['group_metrics'][education_mapping[reference_level]] = {}

        for comparison_level in other_levels:
            unprivileged_groups = [{attr: comparison_level}]
            binary_metric = BinaryLabelDatasetMetric(dataset, 
                                                     unprivileged_groups=unprivileged_groups, 
                                                     privileged_groups=privileged_groups)

            education_pair_metrics = {
                'statistical_parity_difference': binary_metric.statistical_parity_difference(),
                'disparate_impact': binary_metric.disparate_impact(),
            }

            metrics['group_metrics'][education_mapping[reference_level]][education_mapping[comparison_level]] = handle_nan_inf(education_pair_metrics)

    privileged_groups = [{attr: 3.0}]  # 3 corresponds to PhD
    unprivileged_groups = [{attr: level} for level in education_values if level != 3.0]

    overall_metric = BinaryLabelDatasetMetric(dataset, 
                                              unprivileged_groups=unprivileged_groups, 
                                              privileged_groups=privileged_groups)

    metrics['overall'] = handle_nan_inf({
        'statistical_parity_difference': overall_metric.statistical_parity_difference(),
        'disparate_impact': overall_metric.disparate_impact(),
    })

    return metrics

def handle_nan_inf(metrics):
    for key, value in metrics.items():
        if np.isinf(value):
            metrics[key] = "Infinity" if value > 0 else "-Infinity"
        elif np.isnan(value):
            metrics[key] = None
        else:
            metrics[key] = float(value)
    return metrics

if __name__ == "__main__":
    try:
        original_data_json = sys.argv[1]
        reweighed_data_json = sys.argv[2]
        label_names_json = sys.argv[3]
        protected_attribute_names_json = sys.argv[4]
        dataset_type = sys.argv[5]
        reference_religion = sys.argv[6]

        original_data = json.loads(original_data_json)
        reweighed_data = json.loads(reweighed_data_json) if reweighed_data_json != 'null' else None
        label_names = json.loads(label_names_json)
        protected_attribute_names = json.loads(protected_attribute_names_json)

        print(f"Label names: {label_names}", file=sys.stderr)
        print(f"Protected attribute names: {protected_attribute_names}", file=sys.stderr)
        print(f"Dataset type: {dataset_type}", file=sys.stderr)
        print(f"Reference religion: {reference_religion}", file=sys.stderr)

        original_metrics = detect_bias(original_data, label_names, protected_attribute_names, dataset_type, reference_religion)
        
        reweighed_metrics = {}
        if dataset_type.lower() == 'true' and reweighed_data is not None:
            reweighed_metrics = detect_bias(reweighed_data, label_names, protected_attribute_names, dataset_type, reference_religion)

        combined_metrics = {
            'original': original_metrics,
            'reweighed': reweighed_metrics if dataset_type.lower() == 'true' else {}
        }

        print(json.dumps(combined_metrics))
    except Exception as e:
        print(f"Error in main: {str(e)}", file=sys.stderr)
        import traceback
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        print(json.dumps({'error': str(e)}))
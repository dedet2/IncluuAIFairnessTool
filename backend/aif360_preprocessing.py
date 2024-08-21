import pandas as pd
import numpy as np
import sys
import json
import logging
from aif360.datasets import BinaryLabelDataset
from aif360.algorithms.preprocessing import Reweighing

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

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

def calculate_raw_data(df, target_column, protected_attributes):
    raw_data = {}
    for attr in protected_attributes:
        raw_data[attr] = {}
        for group in df[attr].unique():
            group_data = df[df[attr] == group]
            approved = group_data[group_data[target_column] == 1.0].shape[0]
            total = group_data.shape[0]
            raw_data[attr][int(group)] = {
                'approved': int(approved),
                'total': int(total)
            }
    logger.info(f"Raw data calculated: {json.dumps(raw_data, indent=2)}")
    return raw_data

def preprocess_data(dataset, target_column, protected_attributes, dataset_type, reference_religion, reference_sexual_orientation):
    try:
        # Convert the parsed data into a Pandas DataFrame
        df = pd.DataFrame(dataset)
         # When handling protected attributes
        for attr in protected_attributes:
            attr_no_space = attr.replace(' ', '')
            if attr in df.columns:
                # Process normally
                unique_values = df[attr].unique()
                # ... rest of the processing ...
            elif attr_no_space in df.columns:
                # Rename the column to include the space
                df.rename(columns={attr_no_space: attr}, inplace=True)
                unique_values = df[attr].unique()
                # ... rest of the processing ...
            else:
                logger.warning(f"'{attr}' column not found in the data. Skipping {attr}-specific processing.")
        # Remove BOM from column names if present
        df.columns = df.columns.str.lstrip('\ufeff')

        logger.info(f"Column names in the DataFrame: {df.columns.tolist()}")
        logger.info(f"DataFrame before preprocessing:\n{df.head().to_json()}")

        # Remove rows with any NA values or empty strings
        df = df.replace('', pd.NA).dropna()
        logger.info(f"Shape after removing NA values: {df.shape}")

        # Custom encoding for Race, Outcome, Gender, Age, Education Level, Disability, and Sexual Orientation columns
        race_mapping = {'Black': 0, 'Hispanic': 1, 'Asian': 2, 'White': 3}
        outcome_mapping = {'Denied': 0, 'Approved': 1}
        gender_mapping = {'Female': 0, 'Male': 1}
        education_mapping = {'High School': 0, 'Bachelor': 1, 'Master': 2, 'PhD': 3}
        disability_mapping = {'No': 1, 'Yes': 0}
        sexual_orientation_mapping = {
            'Heterosexual': 1,  # Privileged group
            'Lesbian': 0,
            'Gay': 0,
            'Bisexual': 0,
            'Asexual': 0,
            'Queer': 0,
            'Pansexual': 0
        }

        # Apply mappings
        if 'Race' in df.columns:
            df['Race'] = df['Race'].map(race_mapping)
        df[target_column] = df[target_column].map(outcome_mapping)
        if 'Gender' in df.columns:
            df['Gender'] = df['Gender'].map(gender_mapping)
        if 'Age' in df.columns:
            df['Age'] = pd.to_numeric(df['Age'], errors='coerce')
            df = df.dropna(subset=['Age'])
            df['Age'] = (df['Age'] < 40).astype(int)  # Young (< 40) is 1, Old (≥ 40) is 0
        if 'Education' in df.columns:
            df['Education'] = df['Education'].map(education_mapping)
        if 'Disability' in df.columns:
            df['Disability'] = df['Disability'].map(disability_mapping)

        # Handle Religion column
        if 'Religion' in df.columns and reference_religion:
            unique_religions = df['Religion'].unique()
            logger.info(f"Unique religions found: {unique_religions}")
            religion_mapping = {religion: (1 if religion == reference_religion else 0) for religion in unique_religions}
            df['Religion'] = df['Religion'].map(religion_mapping)
        else:
            logger.warning("'Religion' column not found in the data or no reference religion provided. Skipping religion-specific processing.")

        # Handle Sexual Orientation column
        sexual_orientation_column = 'Sexual Orientation' if 'Sexual Orientation' in df.columns else 'SexualOrientation'
        if sexual_orientation_column in df.columns:
            if reference_sexual_orientation:
                unique_orientations = df[sexual_orientation_column].unique()
                logger.info(f"Unique sexual orientations found: {unique_orientations}")
                sexual_orientation_mapping = {orientation: (1 if orientation == reference_sexual_orientation else 0) for orientation in unique_orientations}
            df[sexual_orientation_column] = df[sexual_orientation_column].map(sexual_orientation_mapping)
            # Rename the column to 'SexualOrientation' for consistency
            df.rename(columns={sexual_orientation_column: 'SexualOrientation'}, inplace=True)
            if 'SexualOrientation' not in protected_attributes:
                protected_attributes.append('SexualOrientation')
        else:
            logger.warning("'Sexual Orientation' column not found in the data. Skipping sexual orientation-specific processing.")

        # Remove any rows that couldn't be mapped (i.e., contain NaN after mapping)
        df = df.dropna()
        logger.info(f"Shape after encoding and removing unmapped values: {df.shape}")

        # Convert only numeric columns to float
        for col in df.columns:
            if df[col].dtype in ['int64', 'float64']:
                df[col] = df[col].astype(float)

        logger.info(f"DataFrame after encoding:\n{df.to_json(orient='records')}")

        # Ensure all columns are present and in the correct order
        required_columns = [col for col in protected_attributes + [target_column] if col in df.columns]
        df = df[required_columns]

        # Calculate raw data
        raw_data = calculate_raw_data(df, target_column, [col for col in protected_attributes if col in df.columns])

        # Convert the DataFrame into an AIF360 dataset
        dataset = BinaryLabelDataset(favorable_label=1.0, unfavorable_label=0.0,
                                     df=df,
                                     label_names=[target_column],
                                     protected_attribute_names=[col for col in protected_attributes if col in df.columns])

        logger.info(f"AIF360 dataset:\n{dataset.convert_to_dataframe()[0].to_json(orient='records')}")

        # Calculate outcome rates
        outcome_rates = calculate_outcome_rates(dataset, [col for col in protected_attributes if col in df.columns])

        # Perform reweighting if dataset type is training data
        if dataset_type == 'training':
            privileged_groups = [{attr: 1.0} for attr in dataset.protected_attribute_names]
            unprivileged_groups = [{attr: 0.0} for attr in dataset.protected_attribute_names]
            reweighing = Reweighing(privileged_groups=privileged_groups,
                                    unprivileged_groups=unprivileged_groups)
            dataset_transf = reweighing.fit_transform(dataset)

            # Convert the preprocessed dataset back to a JSON-serializable format
            preprocessed_data = dataset_transf.convert_to_dataframe()[0].to_dict(orient='records')
            logger.info(f"Reweighed dataset:\n{json.dumps(preprocessed_data[:5])}") # Log first 5 rows

            result = {
                'original_data': df.to_dict(orient='records'),
                'reweighed_data': preprocessed_data,
                'outcome_rates': outcome_rates,
                'raw_data': raw_data,
                'error': None
            }
        else:
            # If not training data, just return the original dataset
            result = {
                'original_data': df.to_dict(orient='records'),
                'reweighed_data': None,
                'outcome_rates': outcome_rates,
                'raw_data': raw_data,
                'error': None
            }
        
        logger.info(f"Preprocessing result:\n{json.dumps(result, indent=2)}")
        return result
    except Exception as e:
        logger.error(f"Error in preprocessing: {str(e)}")
        return {'original_data': None, 'reweighed_data': None, 'outcome_rates': None, 'raw_data': None, 'error': str(e)}

def calculate_raw_data(df, target_column, protected_attributes):
    raw_data = {}
    for attr in protected_attributes:
        raw_data[attr] = {}
        if attr == 'Religion':
            # Handle Religion separately to preserve individual religion data
            for religion in df[attr].unique():
                group_data = df[df[attr] == religion]
                approved = group_data[group_data[target_column] == 1.0].shape[0]
                total = group_data.shape[0]
                raw_data[attr][religion] = {
                    'approved': int(approved),
                    'total': int(total)
                }
        elif attr.startswith('Religion_'):
            # Handle one-hot encoded religion columns
            religion = attr.split('_', 1)[1]
            group_data = df[df[attr] == 1]
            approved = group_data[group_data[target_column] == 1.0].shape[0]
            total = group_data.shape[0]
            if 'Religion' not in raw_data:
                raw_data['Religion'] = {}
            raw_data['Religion'][religion] = {
                'approved': int(approved),
                'total': int(total)
            }
        else:
            for group in df[attr].unique():
                group_data = df[df[attr] == group]
                approved = group_data[group_data[target_column] == 1.0].shape[0]
                total = group_data.shape[0]
                raw_data[attr][str(group)] = {
                    'approved': int(approved),
                    'total': int(total)
                }
    logger.info(f"Raw data calculated: {json.dumps(raw_data, indent=2)}")
    return raw_data
if __name__ == '__main__':
    try:
        data_json = sys.argv[1]
        target_column = sys.argv[2]
        protected_attributes_json = sys.argv[3]
        dataset_type = sys.argv[4]
        reference_religion = sys.argv[5]
        reference_sexual_orientation = sys.argv[6] if len(sys.argv) > 6 else None

        data = json.loads(data_json)
        protected_attributes = json.loads(protected_attributes_json)

        logger.info(f"Input data: {json.dumps(data[:5], indent=2)}")  # Log first 5 rows
        logger.info(f"Target column: {target_column}")
        logger.info(f"Protected attributes: {protected_attributes}")
        logger.info(f"Dataset type: {dataset_type}")
        logger.info(f"Reference religion: {reference_religion}")
        logger.info(f"Reference sexual orientation: {reference_sexual_orientation}")

        preprocessed_data = preprocess_data(data, target_column, protected_attributes, dataset_type, reference_religion, reference_sexual_orientation)
        print(json.dumps(preprocessed_data))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
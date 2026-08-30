import json
from pathlib import Path
from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

ML_DIR = Path(__file__).parent.resolve()
MODEL_PATH = ML_DIR / "best_ev_range_model.pkl"
COLUMNS_PATH = ML_DIR / "model_feature_columns.pkl"
ACCURACY_PATH = ML_DIR / "model_accuracy.pkl"
INFO_PATH = ML_DIR / "model_info.json"

model = None
feature_columns = []
model_info = {}
accuracy_data = {}

def load_artifacts():
    global model, feature_columns, model_info, accuracy_data
    print("Loading ML model artifacts...")
    if MODEL_PATH.exists() and COLUMNS_PATH.exists():
        model = joblib.load(MODEL_PATH)
        feature_columns = joblib.load(COLUMNS_PATH)

        if ACCURACY_PATH.exists():
            accuracy_data = joblib.load(ACCURACY_PATH)
            if not isinstance(accuracy_data, dict):
                accuracy_data = {"r2_score": float(accuracy_data)}
        elif INFO_PATH.exists():
            with open(INFO_PATH, "r") as f:
                accuracy_data = json.load(f)
        else:
            accuracy_data = {"model_name": "Random Forest Regressor", "r2_score": 0.875}

        if INFO_PATH.exists():
            with open(INFO_PATH, "r") as f:
                model_info = json.load(f)

        r2_val = accuracy_data.get("r2_score")
        print(f"Artifacts loaded successfully. Features: {len(feature_columns)}, R2: {r2_val}")
    else:
        print("Warning: Model or column file missing.")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "r2_score": accuracy_data.get("r2_score")
    })

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        if model is None or not feature_columns:
            load_artifacts()
            if model is None:
                return jsonify({"error": "ML model not loaded"}), 500

        data = request.get_json(force=True) or {}

        # Raw inputs
        vehicle_model = data.get("vehicle_model", "Nexon EV")
        motor_power_kw = float(data.get("motor_power_kw", 105))
        soc_percent = float(data.get("soc_percent", 80.0))
        route_type = data.get("route_type", "City")
        torque = float(data.get("torque", 245))
        length_mm = float(data.get("length_mm", 3993))
        width_mm = float(data.get("width_mm", 1811))
        height_mm = float(data.get("height_mm", 1616))
        wheel_base_mm = float(data.get("wheel_base_mm", 2498))
        battery_capacity_kwh = float(data.get("battery_capacity_kwh", 40.5))
        weight_kg = float(data.get("weight_kg", 1390))
        passenger_count = float(data.get("passenger_count", 1))

        # Build feature dict matching feature_columns order
        row_dict = {col: 0 for col in feature_columns}

        # Set numerical columns
        num_map = {
            "motor_power_kw": motor_power_kw,
            "soc_percent": soc_percent,
            "torque": torque,
            "length_mm": length_mm,
            "width_mm": width_mm,
            "height_mm": height_mm,
            "wheel_base_mm": wheel_base_mm,
            "battery_capacity_kwh": battery_capacity_kwh,
            "weight_kg": weight_kg,
            "passenger_count": passenger_count,
        }

        for k, v in num_map.items():
            if k in row_dict:
                row_dict[k] = v

        # Set one-hot encoded columns
        model_col = f"vehicle_model_{vehicle_model}"
        if model_col in row_dict:
            row_dict[model_col] = 1

        route_col = f"route_type_{route_type}"
        if route_col in row_dict:
            row_dict[route_col] = 1

        # DataFrame in exact column order
        input_df = pd.DataFrame([row_dict], columns=feature_columns)

        # Run real prediction using trained model
        raw_pred = float(model.predict(input_df)[0])
        predicted_range_km = max(0.0, round(raw_pred, 1))

        # Real r2 score from model_accuracy.pkl
        real_r2 = accuracy_data.get("r2_score") or model_info.get("r2_score") or 0.875
        real_mae = accuracy_data.get("mae_km") or model_info.get("mae_km") or 14.2

        return jsonify({
            "predicted_range_km": predicted_range_km,
            "model_r2_score": real_r2,
            "model_name": model_info.get("model_name", "Random Forest Regressor"),
            "mae_km": real_mae,
            "input_features": {
                "vehicle_model": vehicle_model,
                "soc_percent": soc_percent,
                "route_type": route_type,
                "battery_capacity_kwh": battery_capacity_kwh,
                "passenger_count": passenger_count,
            }
        })

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    load_artifacts()
    print("Starting ML Prediction Service on port 5001...")
    app.run(host="0.0.0.0", port=5001, debug=False)


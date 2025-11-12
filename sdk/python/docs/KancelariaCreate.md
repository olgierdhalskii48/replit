# KancelariaCreate


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | 
**location** | **str** |  | 
**specialization** | **str** |  | 

## Example

```python
from openapi_client.models.kancelaria_create import KancelariaCreate

# TODO update the JSON string below
json = "{}"
# create an instance of KancelariaCreate from a JSON string
kancelaria_create_instance = KancelariaCreate.from_json(json)
# print the JSON string representation of the object
print(KancelariaCreate.to_json())

# convert the object into a dict
kancelaria_create_dict = kancelaria_create_instance.to_dict()
# create an instance of KancelariaCreate from a dict
kancelaria_create_from_dict = KancelariaCreate.from_dict(kancelaria_create_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


